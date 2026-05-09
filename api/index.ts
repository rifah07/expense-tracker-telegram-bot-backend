/**
 * Vercel Serverless Entry Point
 *
 * Vercel looks for `api/index.ts` and exports the Express app as the
 * default handler. Every route in the Express app is served from here.
 *
 * The vercel.json routes config catches ALL paths and sends them here.
 */
import { createApp } from "../src/app";

const app = createApp();
console.log("API STARTED");

export default app;
