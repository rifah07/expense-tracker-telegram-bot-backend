import { prisma } from "../../config/database";

export const expenseRepository = {
  create: async (data: {
    userId: string;
    amount: number;
    category: string;
    note: string;
    date: Date;
  }) => {
    return prisma.expense.create({ data });
  },

  findByDateRange: async (userId: string, startDate: Date, endDate: Date) => {
    return prisma.expense.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "desc" },
    });
  },

  findToday: async (userId: string) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return expenseRepository.findByDateRange(userId, start, end);
  },

  findThisWeek: async (userId: string) => {
    const now = new Date();
    const start = new Date(now);
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(now.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return expenseRepository.findByDateRange(userId, start, end);
  },

  findThisMonth: async (userId: string) => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return expenseRepository.findByDateRange(userId, start, end);
  },

  getMonthlyTotal: async (userId: string): Promise<number> => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    const result = await prisma.expense.aggregate({
      where: { userId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0;
  },

  sumByCategory: async (userId: string, startDate: Date, endDate: Date) => {
    const result = await prisma.expense.groupBy({
      by: ["category"],
      where: { userId, date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
    });
    return result.map((r) => ({
      category: r.category,
      total: r._sum.amount ?? 0,
      count: r._count.id,
    }));
  },

  findRecent: async (userId: string, limit = 10) => {
    return prisma.expense.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: limit,
    });
  },

  delete: async (id: string, userId: string) => {
    return prisma.expense.delete({ where: { id, userId } });
  },
};
