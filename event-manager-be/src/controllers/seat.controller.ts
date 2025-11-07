import { Request, Response, NextFunction } from "express";
import { injectable, inject } from "tsyringe";
import { SeatService } from "../services/seat.service";

@injectable()
export class SeatController {
  constructor(@inject(SeatService) private seatService: SeatService) {}

  // 🪑 List seats with pagination
  async getSeats(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.seatService.listSeats(page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // ⚙️ Update seat status manually (admin or internal)
  async updateSeatStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { seats, status } = req.body;

      if (!Array.isArray(seats) || seats.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Seats array is required." });
      }

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Status is required." });
      }

      const result = await this.seatService.updateSeatStatus(seats, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // 🆕 Create a new session (browser-based)
  async createSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = await this.seatService.createSession();
      res.status(201).json({
        success: true,
        sessionId,
        message: "Session created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // ✋ Hold a seat with session
  async holdSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const { seatId } = req.body;
      const sessionId =
        (req.headers["x-session-id"] as string) ||
        (req.body.sessionId as string);

      if (!seatId)
        return res
          .status(400)
          .json({ success: false, message: "seatId is required." });

      if (!sessionId)
        return res
          .status(400)
          .json({ success: false, message: "sessionId is required." });

      const heldSeat = await this.seatService.holdSeatWithSession(
        sessionId,
        seatId
      );

      res.status(200).json({
        success: true,
        seat: heldSeat,
        message: "Seat held successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 🔓 Release seat (only if same session)
  async releaseSeat(req: Request, res: Response, next: NextFunction) {
    try {
      const { seatId } = req.body;
      const sessionId =
        (req.headers["x-session-id"] as string) ||
        (req.body.sessionId as string);

      if (!seatId)
        return res
          .status(400)
          .json({ success: false, message: "seatId is required." });

      if (!sessionId)
        return res
          .status(400)
          .json({ success: false, message: "sessionId is required." });

      const releasedSeat = await this.seatService.releaseSeat(
        sessionId,
        seatId
      );

      res.status(200).json({
        success: true,
        seat: releasedSeat,
        message: "Seat released successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 🧹 Cleanup expired holds (optional)
  async cleanupExpired(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await this.seatService.cleanupExpiredSessions();
      res.status(200).json({
        ...result,
        message: "Expired seat holds cleaned up successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  // 🎟️ Complete reservation
  async completeReservation(req: Request, res: Response, next: NextFunction) {
    try {
      const { seatIds } = req.body;
      const sessionId =
        (req.headers["x-session-id"] as string) ||
        (req.body.sessionId as string);

      if (!sessionId)
        return res
          .status(400)
          .json({ success: false, message: "Session ID is required." });

      const result = await this.seatService.completeReservation(
        sessionId,
        seatIds
      );

      res.status(200).json({
        ...result,
        message: "Reservation completed successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
}
