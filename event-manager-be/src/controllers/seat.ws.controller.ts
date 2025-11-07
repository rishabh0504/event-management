// src/controllers/seat.ws.controller.ts
import { injectable } from "tsyringe";
import { WebSocket } from "ws";
import { SeatWsService } from "../services/seat.ws.service";

@injectable()
export class SeatWsController {
  constructor(private seatWsService: SeatWsService) {}

  handleConnection(ws: WebSocket, clientId: string) {
    this.seatWsService.registerClient(ws);
  }

  handleDisconnect(ws: WebSocket, clientId: string) {
    this.seatWsService.unregisterClient(clientId);
  }

  async handleJoin(ws: WebSocket, data: { sessionId: string }) {
    await this.seatWsService.joinSession(ws, data.sessionId);
  }

  async handleHold(ws: WebSocket, data: { seatId: string; sessionId: string }) {
    await this.seatWsService.holdSeat(ws, data);
  }

  async handleRelease(
    ws: WebSocket,
    data: { seatId: string; sessionId: string }
  ) {
    await this.seatWsService.releaseSeat(ws, data);
  }

  async handleComplete(
    ws: WebSocket,
    data: { seatIds: string[]; sessionId: string }
  ) {
    await this.seatWsService.completeSeats(ws, data);
  }
}
