/**
 * @swagger
 * components:
 *   schemas:
 *     Seat:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         section_id:
 *           type: string
 *         row_id:
 *           type: string
 *         col:
 *           type: integer
 *         x:
 *           type: number
 *         y:
 *           type: number
 *         price_tier:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [available, reserved, sold, held]
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 */

export interface PaginatedSeats {
  data: any[];
  total: number;
  page: number;
  limit: number;
}
