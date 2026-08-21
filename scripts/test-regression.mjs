import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  dataUrlByteLength,
  MAX_FILE_BYTES,
  validateChatMessages,
  validateFileUIPart,
} from "../src/lib/chat-message-validation.mjs";
import { originalMessagesForContactFlow } from "../src/lib/contact-flow.mjs";

const port = 3011;
const baseUrl = process.env.LIARA_TEST_BASE_URL || `http://127.0.0.1:${port}`;
let server;

function validFile() {
  return {
    type: "file",
    mediaType: "text/plain",
    filename: "readme.txt",
    url: "data:text/plain;base64,SGVsbG8=",
  };
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/chat-config/`);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("regression server did not start");
}

test.before(async () => {
  if (!process.env.LIARA_TEST_BASE_URL) {
    server = spawn(process.execPath, ["server.js", "dev"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore",
    });
  }
  await waitForServer();
});

test.after(() => {
  if (server && !server.killed) server.kill();
});

test("validates FileUIPart data URLs and file-only messages", () => {
  assert.equal(validateFileUIPart(validFile()), true);
  assert.equal(validateChatMessages([{ role: "user", parts: [validFile()] }]), true);
  assert.equal(dataUrlByteLength(validFile().url), 5);
  assert.equal(validateFileUIPart({}), false);
  assert.equal(validateFileUIPart({ ...validFile(), type: "unknown" }), false);
  assert.equal(validateFileUIPart({ ...validFile(), url: "data:text/plain;base64,not-valid!" }), false);
  assert.equal(validateFileUIPart({ ...validFile(), mediaType: "application/pdf" }), false);
  assert.equal(validateChatMessages([{ role: "superadmin", parts: [{ type: "text", text: "bad" }] }]), false);
  assert.equal(MAX_FILE_BYTES, 4 * 1024 * 1024);
});

test("contact retries preserve the original user question", () => {
  const messages = [
    { role: "user", parts: [{ type: "text", text: "چطور برنامه Node را مستقر کنم؟" }] },
    { role: "assistant", metadata: { liaStage: "awaiting_contact" }, parts: [{ type: "text", text: "contact" }] },
    { role: "user", parts: [{ type: "text", text: "شماره اشتباه" }] },
    { role: "assistant", metadata: { liaStage: "awaiting_contact" }, parts: [{ type: "text", text: "contact" }] },
    { role: "user", parts: [{ type: "text", text: "باز هم اشتباه" }] },
    { role: "assistant", metadata: { liaStage: "awaiting_contact" }, parts: [{ type: "text", text: "contact" }] },
    { role: "user", parts: [{ type: "text", text: "نام و نام خانوادگی: تست\nشماره موبایل: 09121234567" }] },
  ];
  const original = originalMessagesForContactFlow(messages);
  assert.equal(original.length, 1);
  assert.match(original[0].parts[0].text, /Node/);
});

test("chat API rejects malformed parts and exposes no model configuration", async () => {
  const configResponse = await fetch(`${baseUrl}/api/chat-config/`);
  assert.equal(configResponse.status, 200);
  assert.deepEqual(Object.keys(await configResponse.json()).sort(), ["configured"]);

  const invalidResponse = await fetch(`${baseUrl}/api/chat/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", parts: [{}] }] }),
  });
  assert.equal(invalidResponse.status, 400);
});

test("local docs search returns focused unique Node deployment sources", async () => {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}/api/docs-search/?q=deploy%20node`);
  const elapsed = performance.now() - startedAt;
  assert.equal(response.status, 200);
  const hits = (await response.json()).hits || [];
  assert.ok(hits.length > 0);
  assert.ok(hits.length <= 4);
  assert.equal(new Set(hits.map((hit) => hit.url)).size, hits.length);
  assert.ok(hits.slice(0, 2).some((hit) => /node|نود/i.test(`${hit.title} ${hit.path} ${hit.section}`)));
  assert.ok(!hits.some((hit) => /slack|telegram|vue|deno/i.test(`${hit.title} ${hit.path} ${hit.section}`)));
  assert.ok(elapsed < 4000, `docs search took ${Math.round(elapsed)}ms`);
});

test("greeting is static and does not require a model", async () => {
  const chatId = `regression-${randomUUID()}`;
  let cookie = "";
  try {
    const response = await fetch(`${baseUrl}/api/chat/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chatId, messages: [{ role: "user", parts: [{ type: "text", text: "سلام" }] }] }),
    });
    cookie = response.headers.get("set-cookie")?.split(";")[0] || "";
    assert.equal(response.status, 200);
    assert.match(await response.text(), /سلام/);
  } finally {
    await fetch(`${baseUrl}/api/chats/`, {
      method: "DELETE",
      headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ id: chatId }),
    }).catch(() => {});
  }
});
