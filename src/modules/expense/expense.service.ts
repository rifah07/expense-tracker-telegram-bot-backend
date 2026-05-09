import { expenseRepository } from "./expense.repository";
import { ExpenseSummary, CategorySummary, ExpenseCategory } from "../../types";
import { AppError } from "../../middlewares/errorHandler";
import { createLogger } from "../../config/logger";

const log = createLogger("ExpenseService");

export const expenseService = {
  create: async (data: {
    userId: string;
    amount: number;
    category: string;
    note: string;
    date: Date;
  }) => {
    if (data.amount <= 0)
      throw new AppError(
        "Amount must be greater than 0",
        400,
        "INVALID_AMOUNT",
      );
    const expense = await expenseRepository.create(data);
    log.info("Expense created", { userId: data.userId, amount: data.amount });
    return expense;
  },

  getToday: async (userId: string) => {
    const expenses = await expenseRepository.findToday(userId);
    return { expenses, summary: buildSummary(expenses, "today") };
  },

  getWeek: async (userId: string) => {
    const expenses = await expenseRepository.findThisWeek(userId);
    return { expenses, summary: buildSummary(expenses, "week") };
  },

  getMonth: async (userId: string) => {
    const expenses = await expenseRepository.findThisMonth(userId);
    return { expenses, summary: buildSummary(expenses, "month") };
  },

  getRecent: async (userId: string, limit = 10) => {
    return expenseRepository.findRecent(userId, limit);
  },

  delete: async (id: string, userId: string): Promise<void> => {
    try {
      await expenseRepository.delete(id, userId);
      log.info("Expense deleted", { id, userId });
    } catch {
      throw new AppError(
        "Expense not found or access denied",
        404,
        "EXPENSE_NOT_FOUND",
      );
    }
  },

  getCategoryBreakdown: async (
    userId: string,
    startDate: Date,
    endDate: Date,
  ) => {
    return expenseRepository.sumByCategory(userId, startDate, endDate);
  },
};

function buildSummary(
  expenses: { amount: number; category: string }[],
  period: "today" | "week" | "month",
): ExpenseSummary {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const existing = categoryMap.get(e.category) ?? { total: 0, count: 0 };
    categoryMap.set(e.category, {
      total: existing.total + e.amount,
      count: existing.count + 1,
    });
  }

  const byCategory: CategorySummary[] = Array.from(categoryMap.entries())
    .map(([category, data]) => ({
      category: category as ExpenseCategory,
      total: data.total,
      count: data.count,
    }))
    .sort((a, b) => b.total - a.total);

  const now = new Date();
  const starts = {
    today: new Date(new Date().setHours(0, 0, 0, 0)),
    week: new Date(new Date().setDate(now.getDate() - 6)),
    month: new Date(now.getFullYear(), now.getMonth(), 1),
  };

  return {
    totalAmount,
    count: expenses.length,
    byCategory,
    startDate: starts[period].toISOString(),
    endDate: new Date().toISOString(),
  };
}
