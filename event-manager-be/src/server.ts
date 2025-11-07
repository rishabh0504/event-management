import http from "http";
import crypto from "crypto";
import { WebSocketServer } from "ws";
import app from "./app";
import { config } from "./config/env";
import { registerSeatWsHandlers } from "./websockets/seat.ws";
import fs from "fs-extra";

import path from "path";
const envPath = path.resolve(process.cwd(), ".env");
const examplePath = path.resolve(process.cwd(), ".env.example");

if (!fs.existsSync(envPath)) {
  console.log("⚡ .env not found, creating from .env.example...");
  fs.copySync(examplePath, envPath);
  console.log("✅ .env created!");
}

// Now you can load env normally
import dotenvSafe from "dotenv-safe";
dotenvSafe.config({
  allowEmptyValues: false,
  example: ".env.example",
});

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
