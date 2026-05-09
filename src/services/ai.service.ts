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
    "eat",
    "drink",
    "water",
    "juice",
    "milk",
    "bread",
    "egg",
    "chicken",
    "fish",
    "vegetable",
    "fruit",
    "biscuit",
    "cake",
    "chocolate",
    "ice cream",
    "street food",
    "hotel",
    "tiffin",
    "daal",
    "roti",
    "paratha",
    "khichuri",
    "halim",
    "fuchka",
    "chotpoti",
    "shawarma",
    "sandwich",
    "chips",
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
    "ticket",
    "metro",
    "launch",
    "ferry",
    "boat",
    "tempo",
    "leguna",
    "bike",
    "cycle",
    "oil",
    "gas",
    "travel",
    "journey",
    "trip fare",
  ],
  Shopping: [
    "shopping",
    "grocery",
    "groceries",
    "clothes",
    "clothing",
    "shirt",
    "pant",
    "shoes",
    "bag",
    "dress",
    "market",
    "daraz",
    "amazon",
    "mall",
    "supermarket",
    "buy",
    "purchase",
    "stationery",
    "pen",
    "pencil",
    "book",
    "notebook",
    "copy",
    "paper",
    "eraser",
    "scale",
    "scissors",
    "glue",
    "office supply",
    "school supply",
    "cosmetics",
    "makeup",
    "soap",
    "shampoo",
    "toothpaste",
    "detergent",
    "cleaning",
    "household",
    "furniture",
    "electronic",
    "phone",
    "headphone",
    "charger",
    "cable",
    "cover",
    "glass",
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
    "broadband",
    "utility",
    "service charge",
    "maintenance",
    "dues",
    "fee",
    "tax",
    "insurance",
    "emi",
    "loan",
    "installment",
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
    "test",
    "lab",
    "x-ray",
    "dentist",
    "eye",
    "glasses",
    "lens",
    "injection",
    "vaccine",
    "therapy",
    "paracetamol",
    "napa",
    "antibiotic",
    "syrup",
    "tablet",
    "capsule",
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
    "picnic",
    "party",
    "event",
    "show",
    "play",
    "sport",
    "gym",
    "swimming",
    "cricket",
    "football",
    "streaming",
    "youtube",
    "spotify",
    "disney",
    "subscription",
  ],
  Others: [],
};

// ── Local keyword categorization ─────────────────────────────────────────────
function categorizeByKeyword(text: string): ExpenseCategory | null {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    if (category === "Others") continue;
    if (keywords.some((kw) => lower.includes(kw)))
      return category as ExpenseCategory;
  }
  return null;
}

// ── Parse relative dates ──────────────────────────────────────────────────────
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

// ── Extract amount from text ──────────────────────────────────────────────────
function extractAmount(text: string): number | null {
  // Match numbers at start or end: "250 lunch" or "lunch 250"
  const match =
    text.match(/^(\d+(?:\.\d+)?)\s+/i) ||
    text.match(/\s+(\d+(?:\.\d+)?)$/i) ||
    text.match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]!) : null;
}

// ── Extract note (text without the number) ───────────────────────────────────
function extractNote(text: string, amount: number): string {
  return (
    text
      .replace(amount.toString(), "")
      .replace(/yesterday|today|\d+\s*days?\s*ago/gi, "")
      .trim()
      .replace(/\s+/g, " ") || text.trim()
  );
}

// ── Main parse function ───────────────────────────────────────────────────────
export async function parseExpenseWithAI(text: string): Promise<ParsedExpense> {
  const keywordCategory = categorizeByKeyword(text);
  const amount = extractAmount(text);

  // ── Strategy 1: keyword + amount found locally (no API call) ─────────────
  if (keywordCategory && amount && amount > 0) {
    const note = extractNote(text, amount);
    log.debug("Parsed locally", {
      text,
      amount,
      category: keywordCategory,
      note,
    });
    return {
      amount,
      category: keywordCategory,
      note,
      date: parseRelativeDate(text).toISOString(),
    };
  }

  // ── Strategy 2: amount found but no keyword → use Shopping as default ─────
  // Then try Gemini, but at least have a fallback
  if (amount && amount > 0 && !keywordCategory) {
    log.debug("Amount found, no keyword — trying Gemini", { text });
  }

  // ── Strategy 3: Gemini AI for everything else ─────────────────────────────
  log.debug("Calling Gemini", { text });

  try {
    const prompt = `
You are an expense parser for a Bangladeshi expense tracker app.
Parse the user's message and extract expense details.

User message: "${text}"
Today's date: ${new Date().toISOString().split("T")[0]}

Categories available: ${EXPENSE_CATEGORIES.join(", ")}

Category rules:
- Food: anything edible, drinks, restaurants
- Transport: rickshaw, cng, uber, bus, fuel
- Shopping: clothes, stationery, pencil, pen, book, notebook, household items
- Bills: electricity, rent, internet, phone recharge
- Health: medicine, doctor, hospital
- Entertainment: movies, games, sports
- Others: anything that doesn't fit above

Rules for output:
- amount: extract the number (must be positive)
- category: pick the best match from the list
- note: short description (what was bought)
- date: ISO date YYYY-MM-DD (interpret "yesterday", "2 days ago" etc.)

Respond ONLY with a single line of valid JSON. No markdown, no explanation.
Example: {"amount":20,"category":"Shopping","note":"pencil","date":"2024-05-09"}
`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    log.debug("Gemini raw response", { raw });

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(cleaned) as ParsedExpense;

    if (!parsed.amount || parsed.amount <= 0) {
      throw new Error("No valid amount in AI response");
    }
    if (!EXPENSE_CATEGORIES.includes(parsed.category as ExpenseCategory)) {
      parsed.category = "Others";
    }
    if (!parsed.date || isNaN(Date.parse(parsed.date))) {
      parsed.date = new Date().toISOString();
    }

    log.debug("Gemini parsed successfully", parsed);
    return parsed;
  } catch (err) {
    log.error("Gemini failed", { err, text });

    // ── Final fallback: if we at least have an amount, save as Others ────────
    if (amount && amount > 0) {
      log.debug("Using final fallback with amount found", { amount, text });
      return {
        amount,
        category: "Others",
        note: text.replace(amount.toString(), "").trim() || text,
        date: parseRelativeDate(text).toISOString(),
      };
    }

    throw new Error(
      'Could not understand the expense. Please try:\n"250 lunch"\n"80 rickshaw"\n"500 grocery"',
    );
  }
}
