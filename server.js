const http = require("node:http");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.argv[2] !== "production";
const port = Number(process.env.PORT || 3001);

async function start() {
  const app = next({ dev });
  const handle = app.getRequestHandler();
  const { attachRealtimeClient } = await import("./src/lib/realtime.mjs");
  await app.prepare();

  const server = http.createServer((request, response) => handle(request, response));
  const webSocketServer = new WebSocketServer({ noServer: true });
  const handleUpgrade = app.getUpgradeHandler?.();
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname === "/api/realtime") return webSocketServer.handleUpgrade(request, socket, head, (client) => attachRealtimeClient(client));
    if (handleUpgrade) return handleUpgrade(request, socket, head);
  });
  server.listen(port, () => console.log(`Liara server listening on http://localhost:${port}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
