import { prisma } from "../../config/database";

export const budgetRepository = {
  findByUserId: async (userId: string) => {
    return prisma.budget.findUnique({ where: { userId } });
  },

  upsert: async (data: {
    userId: string;
    monthlyLimit: number;
    alertPercent: number;
  }) => {
    return prisma.budget.upsert({
      where: { userId: data.userId },
      update: {
        monthlyLimit: data.monthlyLimit,
        alertPercent: data.alertPercent,
      },
      create: data,
    });
  },

  delete: async (userId: string): Promise<void> => {
    await prisma.budget.delete({ where: { userId } });
  },
};
