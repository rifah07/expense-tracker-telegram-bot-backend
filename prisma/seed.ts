import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Test user ──────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { telegramId: "123456789" },
    update: {},
    create: {
      telegramId: "123456789",
      name: "Test User",
      username: "testuser",
    },
  });

  console.log(`User created: ${user.name} (${user.telegramId})`);

  // ── Sample budget ──────────────────────────────────────────────────────────
  const budget = await prisma.budget.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      monthlyLimit: 10000,
      alertPercent: 80,
    },
  });

  console.log(`Budget created: ${budget.monthlyLimit} limit`);

  // ── Sample expenses ────────────────────────────────────────────────────────
  const today = new Date();
  const sampleExpenses = [
    { amount: 120, category: "Food", note: "Lunch at office", daysAgo: 0 },
    {
      amount: 50,
      category: "Transport",
      note: "Rickshaw to office",
      daysAgo: 0,
    },
    { amount: 350, category: "Food", note: "Dinner with family", daysAgo: 1 },
    {
      amount: 1200,
      category: "Shopping",
      note: "Grocery shopping",
      daysAgo: 2,
    },
    { amount: 500, category: "Bills", note: "Internet bill", daysAgo: 3 },
    { amount: 80, category: "Transport", note: "CNG fare", daysAgo: 4 },
    { amount: 200, category: "Health", note: "Medicine", daysAgo: 5 },
    {
      amount: 600,
      category: "Entertainment",
      note: "Movie tickets",
      daysAgo: 6,
    },
  ];

  for (const exp of sampleExpenses) {
    const date = new Date(today);
    date.setDate(date.getDate() - exp.daysAgo);
    date.setHours(12, 0, 0, 0);

    await prisma.expense.create({
      data: {
        userId: user.id,
        amount: exp.amount,
        category: exp.category,
        note: exp.note,
        date,
      },
    });
  }

  console.log(`${sampleExpenses.length} sample expenses created`);
  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
