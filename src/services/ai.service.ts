import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";
import { ParsedExpense, ExpenseCategory, EXPENSE_CATEGORIES } from "../types";
import { createLogger } from "../config/logger";

const log = createLogger("AIService");
const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const KEYWORD_MAP: Record<ExpenseCategory, string[]> = {
  Food: [
    "food",
    "lunch",
    "dinner",
    "breakfast",
    "restaurant",
    "cafe",
    "coffee",
    "tea",
    "snack",
    "meal",
    "pizza",
    "burger",
    "rice",
    "biryani",
    "noodles",
    "iftar",
    "sehri",
    "takeout",
    "delivery",
    "kfc",
    "mcdonalds",
  ],
  Transport: [
    "transport",
    "uber",
    "pathao",
    "rickshaw",
    "cng",
    "bus",
    "taxi",
    "ride",
    "fare",
    "fuel",
    "petrol",
    "train",
    "auto",
    "shuttle",
    "parking",
  ],
  Shopping: [
    "shopping",
    "grocery",
    "clothes",
    "shirt",
    "shoes",
    "bag",
    "dress",
    "market",
    "daraz",
    "amazon",
    "mall",
    "supermarket",
    "buy",
  ],
  Bills: [
    "bill",
    "electricity",
    "internet",
    "wifi",
    "rent",
    "water",
    "gas",
    "phone",
    "subscription",
    "netflix",
    "mobile",
    "recharge",
  ],
  Health: [
    "health",
    "medicine",
    "doctor",
    "hospital",
    "pharmacy",
    "clinic",
    "medical",
    "drug",
    "vitamin",
    "checkup",
  ],
  Entertainment: [
    "entertainment",
    "movie",
    "cinema",
    "game",
    "concert",
    "ticket",
    "fun",
    "outing",
    "trip",
    "picnic",
    "party",
  ],
  Others: [],
};

function categorizeByKeyword(text: string): ExpenseCategory | null {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (category === "Others") continue;
    if (keywords.some((kw) => lower.includes(kw)))
      return category as ExpenseCategory;
  }
  return null;
}

function parseRelativeDate(text: string): Date {
  const lower = text.toLowerCase();
  const today = new Date();

  if (lower.includes("yesterday")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d;
  }

  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const d = new Date(today);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1]!));
    return d;
  }

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < days.length; i++) {
    if (lower.includes(days[i]!)) {
      const d = new Date(today);
      const diff = (today.getDay() - i + 7) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return d;
    }
  }

  return today;
}

export async function parseExpenseWithAI(text: string): Promise<ParsedExpense> {
  // 1. Try keyword match first (free, instant)
  const keywordCategory = categorizeByKeyword(text);
  const simpleMatch =
    text.match(/^(\d+(?:\.\d+)?)\s+(.+)$/) ||
    text.match(/^(.+)\s+(\d+(?:\.\d+)?)$/);

  if (simpleMatch && keywordCategory) {
    const isAmountFirst = /^\d/.test(simpleMatch[1]!);
    const amount = parseFloat(
      isAmountFirst ? simpleMatch[1]! : simpleMatch[2]!,
    );
    const note = (isAmountFirst ? simpleMatch[2]! : simpleMatch[1]!).trim();

    log.debug("Parsed by keyword", { text, amount, category: keywordCategory });
    return {
      amount,
      category: keywordCategory,
      note,
      date: parseRelativeDate(text).toISOString(),
    };
  }

  // 2. Fall back to Gemini AI
  log.debug("Using Gemini AI", { text });

  const prompt = `
You are an expense parser. Extract expense details from the user's message.

User message: "${text}"
Today's date: ${new Date().toISOString().split("T")[0]}

Rules:
- amount: positive number only (no currency symbols)
- category: exactly one of: ${EXPENSE_CATEGORIES.join(", ")}
- note: short description (max 100 chars)
- date: ISO date (YYYY-MM-DD) — handle relative dates like "yesterday", "last monday"

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.
Example: {"amount":250,"category":"Food","note":"lunch at office","date":"2024-03-15"}
`;

  const result = await model.generateContent(prompt);
  const response = result.response
    .text()
    .trim()
    .replace(/```json|```/g, "")
    .trim();

  let parsed: ParsedExpense;
  try {
    parsed = JSON.parse(response) as ParsedExpense;
  } catch {
    log.error("Gemini returned invalid JSON", { response });
    throw new Error(
      'Could not parse expense. Try: "250 lunch" or "500 uber ride"',
    );
  }

  if (!parsed.amount || parsed.amount <= 0) {
    throw new Error(
      'Could not find a valid amount. Include a number like "250 lunch".',
    );
  }

  if (!EXPENSE_CATEGORIES.includes(parsed.category as ExpenseCategory)) {
    parsed.category = "Others";
  }

  if (!parsed.date || isNaN(Date.parse(parsed.date))) {
    parsed.date = new Date().toISOString();
  }

  log.debug("Gemini parsed", parsed);
  return parsed;
}
