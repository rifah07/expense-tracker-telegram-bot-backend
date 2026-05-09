import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { userService } from "./user.service";
import { AuthRequest, successResponse } from "../../types";

const loginSchema = z.object({
  telegramId: z.string().min(1, "telegramId is required"),
});

export const userController = {
  // POST /api/auth/login
  login: async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { telegramId } = loginSchema.parse(req.body);
      const result = await userService.loginWithTelegram(telegramId);
      res.json(successResponse(result, "Login successful"));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/auth/me
  getMe: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = await userService.getProfile(req.user!.userId);
      res.json(successResponse(user));
    } catch (err) {
      next(err);
    }
  },
};
