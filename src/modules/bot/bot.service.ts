import { Telegraf, Context } from "telegraf";
import { env } from "../../config/env";
import { createLogger } from "../../config/logger";
import { userService } from "../user/user.service";
import { expenseService } from "../expense/expense.service";
import { budgetService } from "../budget/budget.service";
import { parseExpenseWithAI } from "../../services/ai.service";

const log = createLogger("BotService");

export const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;

const emoji: Record<string, string> = {
  Food: "🍔",
  Transport: "🚗",
  Shopping: "🛍️",
  Bills: "💡",
  Health: "💊",
  Entertainment: "🎬",
  Others: "📦",
};

function progressBar(percent: number, len = 10): string {
  const filled = Math.round((Math.min(percent, 100) / 100) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

async function ensureUser(ctx: Context) {
  const u = ctx.from!;
  return userService.findOrCreate({
    telegramId: String(u.id),
    name: u.first_name,
    username: u.username,
  });
}

bot.start(async (ctx) => {
  try {
    await ensureUser(ctx);
    const name = ctx.from?.first_name ?? "there";
    await ctx.replyWithHTML(`
👋 <b>Hello, ${name}!</b>

I'm your <b>Expense Tracker Bot</b>. Just send me a message to log an expense!

<b>📝 Examples:</b>
<code>250 lunch</code>
<code>80 rickshaw to office</code>
<code>500 uber ride yesterday</code>
<code>1200 grocery shopping</code>

<b>📊 Commands:</b>
/today — Today's expenses
/week — Weekly summary
/month — Monthly summary
/budget — Budget status
/setbudget 10000 — Set monthly budget
/help — Show this message
    `);
  } catch (err) {
    log.error("Error in /start", { err });
    await ctx.reply("Something went wrong. Please try again.");
  }
});

bot.help(async (ctx) => {
  await ctx.replyWithHTML(`
<b>📖 Help</b>

<b>Add expense:</b>
<code>250 lunch</code>
<code>80 rickshaw</code>
<code>500 uber yesterday</code>
<code>1200 grocery 2 days ago</code>

<b>Commands:</b>
/today — Today's expenses
/week — This week summary
/month — This month summary
/budget — Budget status
/setbudget [amount] — Set monthly budget
  `);
});

bot.command("today", async (ctx) => {
  try {
    const user = await ensureUser(ctx);
    const { expenses, summary } = await expenseService.getToday(user.id);

    if (expenses.length === 0) {
      await ctx.reply("No expenses today. Stay frugal! 😄");
      return;
    }

    const lines = expenses.map(
      (e) => `${emoji[e.category] ?? "📦"} <b>${fmt(e.amount)}</b> — ${e.note}`,
    );

    await ctx.replyWithHTML(`
📅 <b>Today's Expenses</b>

${lines.join("\n")}

━━━━━━━━━━━━
💰 <b>Total: ${fmt(summary.totalAmount)}</b> (${summary.count} items)
    `);
  } catch (err) {
    log.error("Error in /today", { err });
    await ctx.reply("Could not fetch today's expenses.");
  }
});

bot.command("week", async (ctx) => {
  try {
    const user = await ensureUser(ctx);
    const { summary } = await expenseService.getWeek(user.id);

    if (summary.count === 0) {
      await ctx.reply("No expenses this week!");
      return;
    }

    const lines = summary.byCategory.map((c) => {
      const pct = Math.round((c.total / summary.totalAmount) * 100);
      return `${emoji[c.category] ?? "📦"} ${c.category}: <b>${fmt(c.total)}</b> (${pct}%)`;
    });

    await ctx.replyWithHTML(`
📅 <b>This Week's Summary</b>

${lines.join("\n")}

━━━━━━━━━━━━
💰 <b>Total: ${fmt(summary.totalAmount)}</b> (${summary.count} items)
    `);
  } catch (err) {
    log.error("Error in /week", { err });
    await ctx.reply("Could not fetch weekly summary.");
  }
});

bot.command("month", async (ctx) => {
  try {
    const user = await ensureUser(ctx);
    const { summary } = await expenseService.getMonth(user.id);
    const budgetStatus = await budgetService.getStatus(user.id);

    if (summary.count === 0) {
      await ctx.reply("No expenses this month!");
      return;
    }

    const lines = summary.byCategory.map((c) => {
      const pct = Math.round((c.total / summary.totalAmount) * 100);
      return `${emoji[c.category] ?? "📦"} ${c.category}: <b>${fmt(c.total)}</b> (${pct}%)`;
    });

    let budgetLine = "";
    if (budgetStatus) {
      const bar = progressBar(budgetStatus.percentUsed);
      budgetLine = `\n━━━━━━━━━━━━\n📊 <b>Budget</b>\n${bar} ${budgetStatus.percentUsed}%\nSpent: ${fmt(budgetStatus.spent)} / ${fmt(budgetStatus.budget.monthlyLimit)}\nLeft: <b>${fmt(Math.max(0, budgetStatus.remaining))}</b>`;
    }

    await ctx.replyWithHTML(`
📅 <b>This Month's Summary</b>

${lines.join("\n")}

━━━━━━━━━━━━
💰 <b>Total: ${fmt(summary.totalAmount)}</b> (${summary.count} items)${budgetLine}
    `);
  } catch (err) {
    log.error("Error in /month", { err });
    await ctx.reply("Could not fetch monthly summary.");
  }
});

bot.command("budget", async (ctx) => {
  try {
    const user = await ensureUser(ctx);
    const status = await budgetService.getStatus(user.id);

    if (!status) {
      await ctx.replyWithHTML(
        "No budget set.\n\nUse <code>/setbudget 10000</code> to set one.",
      );
      return;
    }

    const bar = progressBar(status.percentUsed);
    const e = status.isExceeded ? "🔴" : status.isNearLimit ? "🟡" : "🟢";
    const msg = status.isExceeded
      ? "🔴 <b>Budget exceeded!</b>"
      : status.isNearLimit
        ? `🟡 <b>Warning!</b> ${status.percentUsed}% used.`
        : "🟢 You're on track!";

    await ctx.replyWithHTML(`
${e} <b>Budget Status</b>

${bar} ${status.percentUsed}%

Limit:     <b>${fmt(status.budget.monthlyLimit)}</b>
Spent:     <b>${fmt(status.spent)}</b>
Remaining: <b>${fmt(Math.max(0, status.remaining))}</b>

${msg}
    `);
  } catch (err) {
    log.error("Error in /budget", { err });
    await ctx.reply("Could not fetch budget.");
  }
});

bot.command("setbudget", async (ctx) => {
  try {
    const user = await ensureUser(ctx);
    const args = ctx.message.text.split(" ");
    const amount = parseFloat(args[1] ?? "");

    if (isNaN(amount) || amount <= 0) {
      await ctx.replyWithHTML("❌ Usage: <code>/setbudget 10000</code>");
      return;
    }

    await budgetService.setBudget(user.id, amount);
    await ctx.replyWithHTML(
      `✅ Budget set to <b>${fmt(amount)}</b>/month!\n\nI'll alert you at 80%.`,
    );
  } catch (err) {
    log.error("Error in /setbudget", { err });
    await ctx.reply("Could not set budget.");
  }
});

// ── Free text → expense ───────────────────────────────────────────────────────
bot.on("text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;

  const text = ctx.message.text.trim();
  if (text.length < 2) return;

  try {
    const user = await ensureUser(ctx);
    await ctx.sendChatAction("typing");

    const parsed = await parseExpenseWithAI(text);
    const expense = await expenseService.create({
      userId: user.id,
      amount: parsed.amount,
      category: parsed.category,
      note: parsed.note,
      date: new Date(parsed.date),
    });

    await ctx.replyWithHTML(`
✅ <b>Expense saved!</b>

${emoji[expense.category] ?? "📦"} <b>${expense.category}</b>
💰 <b>${fmt(expense.amount)}</b>
📝 ${expense.note}
📅 ${new Date(expense.date).toLocaleDateString("en-GB")}
    `);

    // Budget alert check
    const { shouldAlert, status } = await budgetService.checkAlert(user.id);
    if (shouldAlert && status) {
      const alertMsg = status.isExceeded
        ? `🔴 <b>Budget Exceeded!</b>\nSpent: ${fmt(status.spent)} / ${fmt(status.budget.monthlyLimit)}`
        : `🟡 <b>Budget Warning!</b> ${status.percentUsed}% used.\nRemaining: ${fmt(Math.max(0, status.remaining))}`;
      await ctx.replyWithHTML(alertMsg);
    }
  } catch (err) {
    log.error("Error parsing expense", { text, err });
    await ctx.replyWithHTML(
      `❌ Couldn't understand that.\n\nTry:\n<code>250 lunch</code>\n<code>80 rickshaw</code>\n<code>500 uber yesterday</code>`,
    );
  }
});

// ── Bot setup ─────────────────────────────────────────────────────────────────
/* export async function setupBot(): Promise<void> {
  if (env.NODE_ENV === "production" && env.WEBHOOK_URL) {
    const webhookUrl = `${env.WEBHOOK_URL}/api/bot/webhook`;
    await bot.telegram.setWebhook(webhookUrl);
    log.info("Webhook set", { webhookUrl });
  } else {
    await bot.telegram.deleteWebhook();
    bot.launch();
    log.info("Bot polling started (development)");
  }
} */

export async function setupBot(): Promise<void> {
  if (env.NODE_ENV === "production") {
    log.info("Production mode - using webhook (not pulling)");
    return;
  }
  // Local development - use polling (no webhook)
  await bot.telegram.deleteWebhook();
  bot.launch();
  log.info("Bot polling started (development)");
}

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
