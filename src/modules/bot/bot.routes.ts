import { Router } from "express";
import { botController } from "./bot.controller";

export const botRouter = Router();

botRouter.post("/webhook", botController.handleWebhook);
botRouter.get("/info", botController.getInfo);
