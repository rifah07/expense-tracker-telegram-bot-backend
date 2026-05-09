import { Request, Response } from "express";
import { bot } from "./bot.service";
import { createLogger } from "../../config/logger";

const log = createLogger("BotController");

export const botController = {
  // POST /api/bot/webhook
  handleWebhook: async (req: Request, res: Response): Promise<void> => {
    try {
      await bot.handleUpdate(req.body);
      res.sendStatus(200);
    } catch (err) {
      log.error("Webhook error", { err });
      res.sendStatus(200); // always 200 to stop Telegram retrying
    }
  },

  // GET /api/bot/info
  getInfo: async (_req: Request, res: Response): Promise<void> => {
    try {
      const info = await bot.telegram.getMe();
      res.json({ success: true, data: info });
    } catch (err) {
      log.error("Could not get bot info", { err });
      res
        .status(500)
        .json({ success: false, error: "Could not fetch bot info" });
    }
  },
};
