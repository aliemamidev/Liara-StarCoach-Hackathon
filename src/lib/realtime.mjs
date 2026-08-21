const clients = new Set();

export function attachRealtimeClient(socket) {
  clients.add(socket);
  socket.on("close", () => clients.delete(socket));
  socket.on("error", () => clients.delete(socket));
  socket.send(JSON.stringify({ type: "realtime.ready" }));
}

export function subscribeRealtime(listener) {
  process.on("liara:realtime", listener);
  return () => process.off("liara:realtime", listener);
}

export function publishRealtime(type, payload = {}) {
  const event = { type, payload, at: Date.now() };
  process.emit("liara:realtime", event);
  const message = JSON.stringify(event);
  for (const socket of clients) {
    if (socket.readyState === 1) socket.send(message);
    else clients.delete(socket);
  }
}
