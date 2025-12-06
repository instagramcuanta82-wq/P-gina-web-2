import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Servidor WebSocket funcionando correctamente.");
});

const wss = new WebSocketServer({ server });

let waitingUser = null;

wss.on("connection", (ws) => {
  ws.partner = null;

  if (waitingUser === null) {
    waitingUser = ws;
    ws.send(JSON.stringify({ type: "status", message: "Esperando a otro usuario..." }));
  } else {
    ws.partner = waitingUser;
    waitingUser.partner = ws;

    ws.send(JSON.stringify({ type: "status", message: "¡Conectado con un extraño!" }));
    waitingUser.send(JSON.stringify({ type: "status", message: "¡Conectado con un extraño!" }));

    waitingUser = null;
  }

  ws.on("message", (msg) => {
    if (ws.partner) {
      ws.partner.send(JSON.stringify({ type: "message", message: msg.toString() }));
    }
  });

  ws.on("close", () => {
    if (waitingUser === ws) waitingUser = null;

    if (ws.partner) {
      ws.partner.send(JSON.stringify({ type: "status", message: "El otro usuario se desconectó." }));
      ws.partner.partner = null;
    }
  });
});

setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === ws.OPEN) ws.ping();
  });
}, 20000);

server.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
