import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { errorResponse } from "../types";

// ─── Custom App Error ────────────────────────────────────────────────────────────
export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res
    .status(404)
    .json(
      errorResponse("NOT_FOUND", `Route ${req.method} ${req.path} not found`),
    );
}

// ─── Global error handler ────────────────────────────────────────────────────────
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    const messages = err.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    res
      .status(400)
      .json(errorResponse("VALIDATION_ERROR", messages.join("; ")));
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, path: req.path });
    }
    res
      .status(err.statusCode)
      .json(errorResponse(err.code ?? "APP_ERROR", err.message));
    return;
  }

  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res
    .status(500)
    .json(
      errorResponse(
        "INTERNAL_SERVER_ERROR",
        process.env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : err.message,
      ),
    );
}
