import assert from "node:assert/strict";
import test from "node:test";
import { hashPassword, isValidEmail, normalizeEmail, verifyPassword } from "../src/lib/auth-core.mjs";

test("password hashing and verification", async () => {
  const hash = await hashPassword("correct horse battery staple");
  assert.notEqual(hash, "correct horse battery staple");
  assert.equal(await verifyPassword("correct horse battery staple", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
});

test("email normalization and validation", () => {
  assert.equal(normalizeEmail(" Admin@Example.com "), "admin@example.com");
  assert.equal(isValidEmail("admin@example.com"), true);
  assert.equal(isValidEmail("invalid"), false);
});
