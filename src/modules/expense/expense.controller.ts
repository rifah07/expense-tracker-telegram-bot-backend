import { Response, NextFunction } from "express";
import { z } from "zod";
import { expenseService } from "./expense.service";
import { AuthRequest, successResponse, EXPENSE_CATEGORIES } from "../../types";

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES as [string, ...string[]]),
  note: z.string().min(1).max(200),
  date: z.string().datetime().optional(),
});

const dateRangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export const expenseController = {
  // POST /api/expenses
  create: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = createExpenseSchema.parse(req.body);
      const expense = await expenseService.create({
        userId: req.user!.userId,
        amount: body.amount,
        category: body.category,
        note: body.note,
        date: body.date ? new Date(body.date) : new Date(),
      });
      res.status(201).json(successResponse(expense, "Expense created"));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/expenses/today
  getToday: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await expenseService.getToday(req.user!.userId);
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/expenses/week
  getWeek: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await expenseService.getWeek(req.user!.userId);
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/expenses/month
  getMonth: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const data = await expenseService.getMonth(req.user!.userId);
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/expenses/recent
  getRecent: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const limit = Number(req.query["limit"]) || 10;
      const expenses = await expenseService.getRecent(req.user!.userId, limit);
      res.json(successResponse(expenses));
    } catch (err) {
      next(err);
    }
  },

  // GET /api/expenses/breakdown
  getBreakdown: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      const data = await expenseService.getCategoryBreakdown(
        req.user!.userId,
        new Date(startDate),
        new Date(endDate),
      );
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/expenses/:id
  delete: async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await expenseService.delete(req.params["id"]!, req.user!.userId);
      res.json(successResponse(null, "Expense deleted"));
    } catch (err) {
      next(err);
    }
  },
};
