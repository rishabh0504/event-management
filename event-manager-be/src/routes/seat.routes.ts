import { Router } from "express";
import { container } from "tsyringe";
import { SeatController } from "../controllers/seat.controller";

const router = Router();
const seatController = container.resolve(SeatController);

/**
 * @swagger
 * tags:
 *   name: Seats
 *   description: Seat session management and retrieval
 */

/**
 * @swagger
 * /api/seats:
 *   get:
 *     summary: Get paginated list of seats
 *     tags: [Seats]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *         description: Number of items per page (default 20)
 *     responses:
 *       200:
 *         description: Paginated list of seats
 */
router.get("/", (req, res, next) => seatController.getSeats(req, res, next));

/**
 * @swagger
 * /api/seats/status:
 *   patch:
 *     summary: Bulk update seat status manually (admin/internal)
 *     tags: [Seats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seats, status]
 *             properties:
 *               seats:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["A1", "A2", "B1"]
 *               status:
 *                 type: string
 *                 enum: [available, reserved, sold, held]
 *     responses:
 *       200:
 *         description: Successfully updated seat statuses
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */
router.patch("/status", (req, res, next) =>
  seatController.updateSeatStatus(req, res, next)
);

/**
 * @swagger
 * /api/seats/session:
 *   post:
 *     summary: Create a new browser session for seat selection
 *     tags: [Seats]
 *     responses:
 *       201:
 *         description: Session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 sessionId:
 *                   type: string
 *                 message:
 *                   type: string
 */
router.post("/session", (req, res, next) =>
  seatController.createSession(req, res, next)
);

/**
 * @swagger
 * /api/seats/hold:
 *   post:
 *     summary: Hold a seat for a specific session
 *     tags: [Seats]
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *           example: "session-abc123"
 *         description: Session ID for seat hold
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seatId]
 *             properties:
 *               seatId:
 *                 type: string
 *                 example: "A1"
 *     responses:
 *       200:
 *         description: Seat held successfully
 *       400:
 *         description: Missing seatId or sessionId
 *       409:
 *         description: Seat already held by another session
 */
router.post("/hold", (req, res, next) =>
  seatController.holdSeat(req, res, next)
);

/**
 * @swagger
 * /api/seats/release:
 *   post:
 *     summary: Release a held seat (only by same session)
 *     tags: [Seats]
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *           example: "session-abc123"
 *         description: Session ID for releasing seat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seatId]
 *             properties:
 *               seatId:
 *                 type: string
 *                 example: "A1"
 *     responses:
 *       200:
 *         description: Seat released successfully
 *       400:
 *         description: Invalid or missing sessionId
 *       403:
 *         description: Cannot release seat held by another session
 */
router.post("/release", (req, res, next) =>
  seatController.releaseSeat(req, res, next)
);

/**
 * @swagger
 * /api/seats/cleanup:
 *   post:
 *     summary: Clean up expired sessions and release seats (admin/internal)
 *     tags: [Seats]
 *     responses:
 *       200:
 *         description: Expired seat holds cleaned up successfully
 */
router.post("/cleanup", (req, res, next) =>
  seatController.cleanupExpired(req, res, next)
);

/**
 * @swagger
 * /api/seats/complete:
 *   post:
 *     summary: Complete reservation for held seats in a session
 *     tags: [Seats]
 *     parameters:
 *       - in: header
 *         name: x-session-id
 *         schema:
 *           type: string
 *           example: "session-xyz123"
 *         description: Session ID of the active booking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [seatIds]
 *             properties:
 *               seatIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["A1", "A2", "A3"]
 *     responses:
 *       200:
 *         description: Seats successfully reserved
 */
router.post("/complete", (req, res, next) =>
  seatController.completeReservation(req, res, next)
);

export default router;
