import "reflect-metadata";
import { container } from "tsyringe";
import { SeatService } from "../services/seat.service";
import { SeatController } from "../controllers/seat.controller";

container.registerSingleton(SeatService);
container.registerSingleton(SeatController);
