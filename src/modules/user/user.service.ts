import { User } from "@prisma/client";
import { userRepository } from "./user.repository";
import { signToken } from "../../middlewares/auth";
import { AppError } from "../../middlewares/errorHandler";
import { createLogger } from "../../config/logger";

const log = createLogger("UserService");

export const userService = {
  // Called on every bot message - ensures user exists in DB
  findOrCreate: async (data: {
    telegramId: string;
    name: string;
    username?: string;
  }): Promise<User> => {
    const user = await userRepository.upsert(data);
    log.debug("User upserted", { telegramId: data.telegramId });
    return user;
  },

  // Called from dashboard login - returns JWT
  loginWithTelegram: async (
    telegramId: string,
  ): Promise<{ token: string; user: User }> => {
    const user = await userRepository.findByTelegramId(telegramId);

    if (!user) {
      throw new AppError(
        "No account found. Please start the bot first by messaging @YourBot on Telegram.",
        404,
        "USER_NOT_FOUND",
      );
    }

    const token = signToken({ userId: user.id, telegramId: user.telegramId });
    log.info("User logged in", { userId: user.id });

    return { token, user };
  },

  // Get user profile - used by dashboard
  getProfile: async (userId: string): Promise<User> => {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404, "USER_NOT_FOUND");
    }

    return user;
  },
};
