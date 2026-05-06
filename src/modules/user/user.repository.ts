import { prisma } from "../../config/database";
import { User } from "@prisma/client";

export const userRepository = {
  findByTelegramId: async (telegramId: string): Promise<User | null> => {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  },

  findById: async (id: string): Promise<User | null> => {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  create: async (data: {
    telegramId: string;
    name: string;
    username?: string;
  }): Promise<User> => {
    return prisma.user.create({ data });
  },

  upsert: async (data: {
    telegramId: string;
    name: string;
    username?: string;
  }): Promise<User> => {
    return prisma.user.upsert({
      where: { telegramId: data.telegramId },
      update: {
        name: data.name,
        username: data.username,
      },
      create: data,
    });
  },
};
