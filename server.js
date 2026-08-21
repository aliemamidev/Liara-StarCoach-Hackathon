const http = require("node:http");
const next = require("next");
const { WebSocketServer } = require("ws");

const dev = process.argv[2] !== "production";
const port = Number(process.env.PORT || 3001);

async function start() {
  const app = next({ dev });
  const handle = app.getRequestHandler();
  const { attachRealtimeClient, subscribeRealtime } = await import("./src/lib/realtime.mjs");
  await app.prepare();

  const server = http.createServer((request, response) => handle(request, response));
  const webSocketServer = new WebSocketServer({ noServer: true });
  subscribeRealtime((event) => {
    const message = JSON.stringify(event);
    for (const client of webSocketServer.clients) if (client.readyState === 1) client.send(message);
  });
  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
    if (pathname !== "/api/realtime") {
      socket.destroy();
      return;
    }
    webSocketServer.handleUpgrade(request, socket, head, (client) => attachRealtimeClient(client));
  });
  server.listen(port, () => console.log(`Liara server listening on http://localhost:${port}`));
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
