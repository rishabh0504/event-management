import http from "http";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import app from "./app";
import { config } from "./config/env";
import { registerSeatWsHandlers } from "./websockets/seat.ws";

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  if (request.url === "/ws/seats") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const clientId = crypto.randomUUID();
      registerSeatWsHandlers(ws, clientId);
    });
  } else {
    socket.destroy();
  }
});

server.listen(config.port, () => {
  console.log(`🚀 Server running on http://localhost:${config.port}`);
  console.log(`🔌 WebSocket ready at ws://localhost:${config.port}/ws/seats`);
});
