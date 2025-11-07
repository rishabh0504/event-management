import "reflect-metadata";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/notFoundHandler";
import seatRoutes from "./routes/seat.routes";
import "./containers";
import { config } from "./config/env";

const app = express();

// ✅ CORS setup — safe for Express v5
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-session-id",
      "seat-session-id",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
  })
);

// (Optional) Explicit preflight handler (regex instead of '*')
app.options(/.*/, cors());

app.use(express.json());

if (config.nodeEnv !== "test") {
  app.use(morgan("dev"));
}

// Swagger Docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/seats", seatRoutes);

// Middleware
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
