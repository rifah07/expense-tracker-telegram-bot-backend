import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { setupBot } from './modules/bot/bot.service';
import { logger } from "./config/logger";

async function bootstrap(): Promise<void> {
  await connectDatabase();
  await setupBot();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running on http://localhost:${env.PORT}`, {
      env: env.NODE_ENV,
      port: env.PORT,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down gracefully...`);

    server.close(async () => {
      await disconnectDatabase();
      logger.info("Server shut down cleanly");
      process.exit(0);
    });

    // Force exit after 10 seconds if still hanging
    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Catch unhandled promise rejections (log + exit so the process restarts)
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", { reason });
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", {
      message: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });
}

bootstrap();
