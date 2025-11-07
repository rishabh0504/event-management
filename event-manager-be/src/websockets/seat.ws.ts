// src/websockets/seat.ws.ts
import { WebSocket } from "ws";
import { container } from "tsyringe";
import { SeatWsController } from "../controllers/seat.ws.controller";

const seatWsController = container.resolve(SeatWsController);

export function registerSeatWsHandlers(ws: WebSocket, clientId: string) {
  // When client connects
  seatWsController.handleConnection(ws, clientId);

  ws.on("message", async (message) => {
    try {
      const { event, data } = JSON.parse(message.toString());
      switch (event) {
        case "join":
          await seatWsController.handleJoin(ws, data);
          break;
        case "hold":
          await seatWsController.handleHold(ws, data);
          break;
        case "release":
          await seatWsController.handleRelease(ws, data);
          break;
        case "complete":
          await seatWsController.handleComplete(ws, data);
          break;
        default:
          ws.send(JSON.stringify({ event: "error", message: "Unknown event" }));
      }
    } catch (err) {
      ws.send(
        JSON.stringify({ event: "error", message: "Invalid message format" })
      );
    }
  });

  ws.on("close", () => seatWsController.handleDisconnect(ws, clientId));
}
