import winston from "winston";
import { env } from "./env";

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

// Dev: readable colored output
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, context, stack, ...meta }) => {
    const ctx = context ? ` [${context}]` : "";
    const metaStr = Object.keys(meta).length
      ? `\n${JSON.stringify(meta, null, 2)}`
      : "";
    return `${timestamp}${ctx} ${level}: ${stack ?? message}${metaStr}`;
  }),
);

// Production: structured JSON for Vercel log drain / any aggregator
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

// ─── Logger instance ────────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

// ─── Context-aware child logger ─────────────────────────────────────────────────
// Usage: const log = createLogger('BotService');  log.info('Started');
export const createLogger = (context: string) => ({
  info: (message: string, meta?: object) =>
    logger.info(message, { context, ...meta }),
  error: (message: string, meta?: object) =>
    logger.error(message, { context, ...meta }),
  warn: (message: string, meta?: object) =>
    logger.warn(message, { context, ...meta }),
  debug: (message: string, meta?: object) =>
    logger.debug(message, { context, ...meta }),
});
