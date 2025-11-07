import { singleton } from "tsyringe";
import { WebSocket } from "ws";
import { randomUUID } from "crypto";

interface Client {
  id: string;
  ws: WebSocket;
  sessionId?: string;
}

@singleton() // 👈 This is CRUCIAL
export class SeatWsService {
  private clients: Map<string, Client> = new Map();
  private seats: Record<string, string> = {};

  registerClient(ws: WebSocket) {
    const clientId = randomUUID();
    console.log(`🟢 [WS] Client connected: ${clientId}`);

    this.clients.set(clientId, { id: clientId, ws });
    ws.send(JSON.stringify({ event: "connected", clientId }));

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(ws, msg);
      } catch {
        console.error("❌ [WS] Invalid JSON:", raw.toString());
        ws.send(JSON.stringify({ event: "error", message: "Invalid JSON" }));
      }
    });

    ws.on("close", () => this.unregisterClient(clientId));
  }

  unregisterClient(clientId: string) {
    console.log(`🔴 [WS] Client disconnected: ${clientId}`);
    this.clients.delete(clientId);
  }

  private async handleMessage(ws: WebSocket, msg: any) {
    const { event } = msg;
    if (!event)
      return ws.send(
        JSON.stringify({ event: "error", message: "Missing event type" })
      );

    switch (event) {
      case "join_session":
      case "joinSession":
        return this.joinSession(ws, msg.sessionId);
      case "hold_seat":
      case "holdSeat":
        return this.holdSeat(ws, msg);
      case "release_seat":
      case "releaseSeat":
        return this.releaseSeat(ws, msg);
      case "complete_seats":
      case "completeSeats":
        return this.completeSeats(ws, msg);
      default:
        console.warn("⚠️ Unknown event received:", event);
        ws.send(
          JSON.stringify({ event: "error", message: `Unknown event: ${event}` })
        );
    }
  }

  private getClientBySocket(ws: WebSocket): Client | undefined {
    for (const client of this.clients.values()) {
      if (client.ws === ws) return client;
    }
    return undefined;
  }

  async joinSession(ws: WebSocket, sessionId: string) {
    const client = this.getClientBySocket(ws);
    if (client) client.sessionId = sessionId;
    console.log(`👤 [WS] Client joined session: ${sessionId}`);
    ws.send(JSON.stringify({ event: "joined", sessionId, seats: this.seats }));
  }

  async holdSeat(
    ws: WebSocket,
    { seatId, sessionId }: { seatId: string; sessionId: string }
  ) {
    if (this.seats[seatId] && this.seats[seatId] !== "available") {
      ws.send(JSON.stringify({ event: "hold_failed", seatId }));
      return;
    }

    this.seats[seatId] = sessionId;
    console.log(`✅ [WS] Seat held: seat=${seatId}, by session=${sessionId}`);
    this.broadcast({ event: "seat_held", seatId, sessionId });
  }

  async releaseSeat(
    ws: WebSocket,
    { seatId, sessionId }: { seatId: string; sessionId: string }
  ) {
    if (this.seats[seatId] !== sessionId) {
      ws.send(JSON.stringify({ event: "release_failed", seatId }));
      return;
    }

    this.seats[seatId] = "available";
    console.log(`✅ [WS] Seat released: seat=${seatId}`);
    this.broadcast({ event: "seat_released", seatId });
  }

  async completeSeats(
    ws: WebSocket,
    { seatIds, sessionId }: { seatIds: string[]; sessionId: string }
  ) {
    for (const seatId of seatIds) {
      if (this.seats[seatId] === sessionId) {
        this.seats[seatId] = "sold";
      }
    }
    console.log(`🏁 [WS] Seats sold for ${sessionId}:`, seatIds);
    this.broadcast({ event: "seats_completed", seatIds, sessionId });
  }

  private broadcast(message: any) {
    const payload = JSON.stringify(message);
    console.log(`📡 [WS] Broadcasting:`, message);
    console.log(
      "🧠 Connected clients:",
      [...this.clients.values()].map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        readyState: c.ws.readyState,
      }))
    );

    for (const [id, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(payload);
          console.log(`📨 Sent to ${id}`);
        } catch (err) {
          console.error(`❌ [WS] Failed to send to ${id}:`, err);
          this.clients.delete(id);
        }
      } else {
        console.warn(`⚠️ [WS] Skipping closed client: ${id}`);
        this.clients.delete(id);
      }
    }
  }
}
