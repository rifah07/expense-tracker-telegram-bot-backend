import { budgetRepository } from "./budget.repository";
import { expenseRepository } from "../expense/expense.repository";
import { AppError } from "../../middlewares/errorHandler";
import { createLogger } from "../../config/logger";

const log = createLogger("BudgetService");

export interface BudgetStatus {
  budget: {
    id: string;
    userId: string;
    monthlyLimit: number;
    alertPercent: number;
  };
  spent: number;
  remaining: number;
  percentUsed: number;
  isExceeded: boolean;
  isNearLimit: boolean;
}

export const budgetService = {
  setBudget: async (
    userId: string,
    monthlyLimit: number,
    alertPercent = 80,
  ) => {
    if (monthlyLimit <= 0)
      throw new AppError(
        "Monthly limit must be greater than 0",
        400,
        "INVALID_BUDGET",
      );
    if (alertPercent < 1 || alertPercent > 100)
      throw new AppError(
        "Alert percent must be 1–100",
        400,
        "INVALID_ALERT_PERCENT",
      );
    const budget = await budgetRepository.upsert({
      userId,
      monthlyLimit,
      alertPercent,
    });
    log.info("Budget set", { userId, monthlyLimit });
    return budget;
  },

  getStatus: async (userId: string): Promise<BudgetStatus | null> => {
    const budget = await budgetRepository.findByUserId(userId);
    if (!budget) return null;

    const spent = await expenseRepository.getMonthlyTotal(userId);
    const remaining = budget.monthlyLimit - spent;
    const percentUsed = Math.round((spent / budget.monthlyLimit) * 100);

    return {
      budget,
      spent,
      remaining,
      percentUsed,
      isExceeded: spent >= budget.monthlyLimit,
      isNearLimit: percentUsed >= budget.alertPercent,
    };
  },

  checkAlert: async (userId: string) => {
    const status = await budgetService.getStatus(userId);
    return {
      shouldAlert: status ? status.isNearLimit || status.isExceeded : false,
      status,
    };
  },

  removeBudget: async (userId: string): Promise<void> => {
    const existing = await budgetRepository.findByUserId(userId);
    if (!existing) throw new AppError("No budget set", 404, "BUDGET_NOT_FOUND");
    await budgetRepository.delete(userId);
  },
};
