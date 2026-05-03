import { Request } from "express";

// ─── Expense ─────────────────────────────────────────────────────────────────────
export type ExpenseCategory =
  | "Food"
  | "Transport"
  | "Shopping"
  | "Bills"
  | "Health"
  | "Entertainment"
  | "Others";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Health",
  "Entertainment",
  "Others",
];

export interface ParsedExpense {
  amount: number;
  category: ExpenseCategory;
  note: string;
  date: string; // ISO 8601
}

// ─── API Response wrapper ────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, message };
}

export function errorResponse(error: string, message?: string): ApiResponse {
  return { success: false, error, message };
}

// ─── Auth ────────────────────────────────────────────────────────────────────────
export interface JwtPayload {
  userId: string;
  telegramId: string;
}

// Extends Express Request to include the authenticated user
export interface AuthRequest extends Request {
  user?: JwtPayload;
}
