import { injectable } from "tsyringe";
import { supabase } from "../config/supabase";
import { PaginatedSeats } from "../types/seat";
import { SeatWsService } from "./seat.ws.service"; // ✅ import websocket service

@injectable()
export class SeatService {
  constructor(private wsService: SeatWsService) {} // ✅ inject websocket service

  async listSeats(page = 1, limit = 20): Promise<PaginatedSeats> {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await supabase
      .from("seats")
      .select("*", { count: "exact" })
      .order("section_id", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message);

    return {
      data: data || [],
      total: count || 0,
      page,
      limit,
    };
  }

  async updateSeatStatus(seatIds: string[], newStatus: string) {
    const allowedStatuses = ["available", "reserved", "sold", "held"];
    if (!allowedStatuses.includes(newStatus)) {
      throw new Error(
        `Invalid status value. Allowed: ${allowedStatuses.join(", ")}`
      );
    }

    const { data, error } = await supabase
      .from("seats")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in("id", seatIds)
      .select("*");

    if (error) throw new Error(`Failed to update seats: ${error.message}`);

    // 🔥 WebSocket broadcast
    this.wsService["broadcast"]({
      event: "seat_status_changed",
      seatIds,
      newStatus,
    });

    return {
      success: true,
      updated: data?.length || 0,
      seats: data?.map((s) => s.id),
    };
  }

  async createSession() {
    const { data, error } = await supabase
      .from("seat_sessions")
      .insert({})
      .select("id")
      .single();

    if (error) throw new Error("Failed to create session: " + error.message);
    return data.id;
  }

  async holdSeatWithSession(sessionId: string, seatId: string) {
    const { data: currentHeld, error: heldError } = await supabase
      .from("seats")
      .select("*")
      .eq("held_by", sessionId)
      .eq("status", "held");

    if (heldError) throw new Error(heldError.message);
    if (currentHeld && currentHeld.length >= 8) {
      throw new Error("Maximum of 8 seats can be held per session.");
    }

    const { data, error } = await supabase
      .from("seats")
      .update({
        status: "held",
        held_by: sessionId,
        held_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", seatId)
      .or(`status.eq.available,held_by.eq.${sessionId}`)
      .select("*")
      .single();

    if (error) throw new Error("Failed to hold seat: " + error.message);

    // 🔥 WebSocket broadcast
    this.wsService["broadcast"]({
      event: "seat_held",
      seatId,
      sessionId,
    });

    return data;
  }

  async releaseSeat(sessionId: string, seatId: string) {
    const { data, error } = await supabase
      .from("seats")
      .update({
        status: "available",
        held_by: null,
        held_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seatId)
      .eq("held_by", sessionId)
      .select("*")
      .single();

    if (error) throw new Error("Failed to release seat: " + error.message);

    // 🔥 WebSocket broadcast
    this.wsService["broadcast"]({
      event: "seat_released",
      seatId,
      sessionId,
    });

    return data;
  }

  async cleanupExpiredSessions() {
    const { error } = await supabase.rpc("release_expired_holds");
    if (error) throw new Error("Cleanup failed: " + error.message);

    // 🔥 Optionally broadcast seat refresh
    this.wsService["broadcast"]({
      event: "cleanup",
      message: "Expired sessions cleaned",
    });

    return { success: true };
  }

  async completeReservation(sessionId: string, seatIds: string[]) {
    if (!sessionId) throw new Error("Session ID is required.");
    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      throw new Error("Seat IDs array is required.");
    }

    const { data: heldSeats, error: fetchError } = await supabase
      .from("seats")
      .select("id, status, held_by")
      .in("id", seatIds);

    if (fetchError) throw new Error(fetchError.message);

    const invalid = heldSeats?.filter(
      (s) => s.held_by !== sessionId || s.status !== "held"
    );

    if (invalid && invalid.length > 0) {
      throw new Error(
        "Some seats are not held by this session or already booked."
      );
    }

    const { data, error } = await supabase
      .from("seats")
      .update({
        status: "sold",
        held_by: null,
        held_at: null,
        updated_at: new Date().toISOString(),
      })
      .in("id", seatIds)
      .eq("held_by", sessionId)
      .select("*");

    if (error)
      throw new Error("Failed to complete reservation: " + error.message);

    // 🔥 WebSocket broadcast
    this.wsService["broadcast"]({
      event: "seats_sold",
      seatIds,
      sessionId,
    });

    return {
      success: true,
      reservedSeats: data,
      count: data?.length || 0,
    };
  }
}
