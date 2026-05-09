import { Response, NextFunction } from "express";
import { z } from "zod";
import { budgetService } from "./budget.service";
import { AuthRequest, successResponse } from "../../types";

const setBudgetSchema = z.object({
  monthlyLimit: z.number().positive(),
  alertPercent: z.number().min(1).max(100).optional().default(80),
});

export const budgetController = {
  // GET /api/budgets/status
  getStatus: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const status = await budgetService.getStatus(req.user!.userId);
      res.json(successResponse(status));
    } catch (err) {
      next(err);
    }
  },

  // POST /api/budgets
  setBudget: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { monthlyLimit, alertPercent } = setBudgetSchema.parse(req.body);
      const budget = await budgetService.setBudget(
        req.user!.userId,
        monthlyLimit,
        alertPercent,
      );
      res.json(successResponse(budget, "Budget updated"));
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/budgets
  removeBudget: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await budgetService.removeBudget(req.user!.userId);
      res.json(successResponse(null, "Budget removed"));
    } catch (err) {
      next(err);
    }
  },
};
