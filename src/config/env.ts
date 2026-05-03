import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Every environment variable is declared and validated here.
const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  TELEGRAM_BOT_TOKEN: z.string().min(1, "TELEGRAM_BOT_TOKEN is required"),
  WEBHOOK_URL: z.string().url("WEBHOOK_URL must be a valid URL").optional(),
  GEMENI_API_KEY: z.string().min(1, "GEMENI_API_KEY is required"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3001")
    .transform(Number)
    .refine((n) => !isNaN(n), "PORT must be a number"),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters long"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL must be a valid URL")
    .default("http://localhost:5173"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\nEnvironment variable validation failed:\n");
  parsed.error.issues.forEach((issue) => {
    console.error(`  [${issue.path.join(".")}] → ${issue.message}`);
  });
  console.error("\n  → Copy .env.example to .env and fill in the values.\n");
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
