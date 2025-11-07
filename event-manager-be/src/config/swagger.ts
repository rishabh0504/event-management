import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env";

const swaggerDefinition = {
  openapi: "3.0.3",
  info: {
    title: "Venue Seat Reservation API",
    version: "1.0.0",
    description: "API documentation for seat, row, section, and venue services",
  },
  servers: [
    {
      url: `http://localhost:${config.port}`,
      description: "Local server",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/types/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
