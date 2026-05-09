import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { requestLogger } from "./middlewares/requestLogger";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { expenseRouter } from "./modules/expense/expense.routes";
import { budgetRouter } from "./modules/budget/budget.routes";
import { userRouter } from "./modules/user/user.routes";
import { botRouter } from "./modules/bot/bot.routes";

export function createApp(): Application {
  const app = express();

  app.use(helmet());

  // ── CORS ─────────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: [
        env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:3000",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────────
  // Note: Telegram webhook sends JSON. Keep raw body available for signature verification.
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));

  // ── Rate limiting ─────────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "TOO_MANY_REQUESTS",
      message: "Too many requests, slow down.",
    },
  });

  // Stricter limit for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(globalLimiter);
  app.use(requestLogger);

  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      env: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/auth", authLimiter, userRouter);
  app.use("/api/expenses", expenseRouter);
  app.use("/api/budgets", budgetRouter);
  app.use("/api/bot", botRouter); // Telegram webhook

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
