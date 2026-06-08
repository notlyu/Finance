const prisma = require('../lib/prisma-client');
const bcrypt = require('bcrypt');

const DEMO_EMAIL = 'demo@finance.test';
const DEMO_PASSWORD = 'Demo1234!';

function randomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

function daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function getSystemCategory(name) {
  return prisma.category.findFirst({ where: { name, is_system: true } });
}

async function main() {
  console.log('Creating demo user...');

  const existingUser = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existingUser) {
    console.log('Demo user already exists. Deleting and recreating...');
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.goal.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.wish.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.budget.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.recurringTransaction.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.debt.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.account.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.userWidgetConfig.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.notificationSetting.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.safetyPillowSetting.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.refreshToken.deleteMany({ where: { user_id: existingUser.id } }),
      prisma.user.delete({ where: { id: existingUser.id } }),
    ]);
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      password_hash: hashedPassword,
      name: 'Демо-пользователь',
    },
  });
  console.log(`User created: id=${user.id}`);

  // Accounts
  const salaryCat = await getSystemCategory('Зарплата');
  const foodCat = await getSystemCategory('Еда');
  const transportCat = await getSystemCategory('Транспорт');
  const funCat = await getSystemCategory('Развлечения');
  const homeCat = await getSystemCategory('Дом');
  const healthCat = await getSystemCategory('Здоровье');
  const eduCat = await getSystemCategory('Образование');
  const clothesCat = await getSystemCategory('Одежда');
  const giftsExpCat = await getSystemCategory('Подарки');
  const freelanceCat = await getSystemCategory('Фриланс');
  const investCat = await getSystemCategory('Инвестиции');
  const otherIncCat = await getSystemCategory('Прочее (доход)');
  const commCat = await getSystemCategory('Коммуналка');
  const commsCat = await getSystemCategory('Связь');

  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        user_id: user.id,
        name: 'Основной счёт',
        type: 'bank',
        balance: 485000.00,
        currency: 'RUB',
        is_active: true,
        is_liquid: true,
        scope: 'personal',
      },
    }),
    prisma.account.create({
      data: {
        user_id: user.id,
        name: 'Накопительный',
        type: 'savings',
        balance: 820000.00,
        currency: 'RUB',
        is_active: true,
        is_liquid: true,
        scope: 'personal',
      },
    }),
    prisma.account.create({
      data: {
        user_id: user.id,
        name: 'Наличные',
        type: 'cash',
        balance: 45000.00,
        currency: 'RUB',
        is_active: true,
        is_liquid: true,
        scope: 'personal',
      },
    }),
  ]);
  console.log(`Accounts created: ${accounts.length}`);

  // Transactions — last 12 months
  const transactions = [];
  const txData = [];

  const now = new Date();

  for (let monthOffset = 11; monthOffset >= 0; monthOffset--) {
    const year = now.getFullYear();
    const month = now.getMonth() - monthOffset;
    const targetMonth = new Date(year, month, 1);

    // Salary on 1st of each month
    txData.push({
      user_id: user.id, category_id: salaryCat.id, amount: 120000,
      type: 'income', date: new Date(targetMonth),
      comment: 'Зарплата', scope: 'personal',
    });

    // Extra income every few months
    if (monthOffset % 3 === 0) {
      txData.push({
        user_id: user.id, category_id: freelanceCat.id, amount: randomAmount(30000, 70000),
        type: 'income', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 15),
        comment: 'Фриланс-проект', scope: 'personal',
      });
    }
    if (monthOffset % 4 === 0) {
      txData.push({
        user_id: user.id, category_id: investCat.id, amount: randomAmount(2000, 5000),
        type: 'income', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 20),
        comment: 'Дивиденды', scope: 'personal',
      });
    }

    // Regular expenses
    const monthlyExpenses = [
      { cat: foodCat, min: 500, max: 3500, label: 'Продукты', count: 8 },
      { cat: foodCat, min: 800, max: 2500, label: 'Ресторан', count: 4 },
      { cat: transportCat, min: 300, max: 2000, label: 'Транспорт', count: 6 },
      { cat: funCat, min: 1000, max: 5000, label: 'Кино/Театр', count: 2 },
      { cat: funCat, min: 1500, max: 4000, label: 'Кафе', count: 3 },
      { cat: homeCat, min: 2000, max: 15000, label: 'Хозтовары', count: 2 },
      { cat: healthCat, min: 500, max: 3000, label: 'Аптека', count: 2 },
      { cat: clothesCat, min: 2000, max: 10000, label: 'Одежда', count: 1 },
      { cat: commsCat, min: 500, max: 1500, label: 'Мобильная связь', count: 1 },
      { cat: commsCat, min: 1000, max: 2000, label: 'Интернет', count: 1 },
    ];

    for (const exp of monthlyExpenses) {
      for (let i = 0; i < exp.count; i++) {
        const day = 1 + Math.floor(Math.random() * 26);
        txData.push({
          user_id: user.id, category_id: exp.cat.id,
          amount: randomAmount(exp.min, exp.max),
          type: 'expense',
          date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day),
          comment: exp.label, scope: 'personal',
        });
      }
    }

    // Utility bills and occasional expenses
    txData.push({
      user_id: user.id, category_id: commCat.id, amount: randomAmount(4800, 6500),
      type: 'expense', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 5),
      comment: 'Квартплата', scope: 'personal',
    });

    if (monthOffset % 3 === 1) {
      txData.push({
        user_id: user.id, category_id: eduCat.id, amount: randomAmount(3000, 8000),
        type: 'expense', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 12),
        comment: 'Курсы', scope: 'personal',
      });
    }

    if (monthOffset === 0) {
      txData.push({
        user_id: user.id, category_id: homeCat.id, amount: randomAmount(8000, 25000),
        type: 'expense', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 18),
        comment: 'Мебель/Ремонт', scope: 'personal',
      });
    }

    // Gifts in specific months
    if (monthOffset % 6 === 0) {
      txData.push({
        user_id: user.id, category_id: giftsExpCat.id, amount: randomAmount(2000, 8000),
        type: 'expense', date: new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 22),
        comment: 'Подарки', scope: 'personal',
      });
    }
  }

  // Create all transactions in bulk
  const BATCH_SIZE = 100;
  for (let i = 0; i < txData.length; i += BATCH_SIZE) {
    const batch = txData.slice(i, i + BATCH_SIZE);
    await prisma.transaction.createMany({ data: batch });
  }
  console.log(`Transactions created: ${txData.length}`);

  // Goal
  const goal = await prisma.goal.create({
    data: {
      user_id: user.id,
      name: 'Накопить на машину',
      target_amount: 1500000,
      current_amount: 520000,
      deadline: new Date(2027, 5, 1),
      scope: 'personal',
      auto_contribute_enabled: true,
      auto_contribute_type: 'fixed',
      auto_contribute_value: 30000,
    },
  });
  console.log(`Goal created: ${goal.name}`);

  const goal2 = await prisma.goal.create({
    data: {
      user_id: user.id,
      name: 'Резервный фонд',
      target_amount: 500000,
      current_amount: 280000,
      scope: 'personal',
      auto_contribute_enabled: true,
      auto_contribute_type: 'percentage',
      auto_contribute_value: 5,
    },
  });
  console.log(`Goal created: ${goal2.name}`);

  // Wishes
  const wish1 = await prisma.wish.create({
    data: {
      user_id: user.id, name: 'iPhone 16 Pro', cost: 149990,
      saved_amount: 0, priority: 2, status: 'active', scope: 'personal',
    },
  });
  const wish2 = await prisma.wish.create({
    data: {
      user_id: user.id, name: 'Поездка в Таиланд', cost: 250000,
      saved_amount: 80000, priority: 1, status: 'active', scope: 'personal',
    },
  });
  const wish3 = await prisma.wish.create({
    data: {
      user_id: user.id, name: 'PlayStation 5', cost: 65000,
      saved_amount: 35000, priority: 3, status: 'active', scope: 'personal',
    },
  });
  console.log(`Wishes created: 3`);

  // Budgets for last 12 months
  const budgetConfigs = [
    { cat: foodCat, limit: 40000 },
    { cat: transportCat, limit: 8000 },
    { cat: funCat, limit: 15000 },
    { cat: homeCat, limit: 20000 },
    { cat: healthCat, limit: 5000 },
    { cat: clothesCat, limit: 10000 },
  ];
  const budgetData = [];
  for (let m = 11; m >= 0; m--) {
    const ym = new Date(now.getFullYear(), now.getMonth() - m, 1).toISOString().slice(0, 7);
    for (const b of budgetConfigs) {
      budgetData.push({
        user_id: user.id, category_id: b.cat.id,
        month: ym, limit_amount: b.limit, scope: 'personal',
      });
    }
  }
  await prisma.budget.createMany({ data: budgetData });
  console.log(`Budgets created: ${budgetData.length}`);

  // Debts
  const debt1 = await prisma.debt.create({
    data: {
      user_id: user.id, name: 'Ипотека', total_amount: 3500000,
      remaining: 2800000, interest_rate: 8.5, monthly_payment: 45000,
      type: 'mortgage', start_date: new Date(2023, 2, 1),
      end_date: new Date(2043, 2, 1), is_active: true,
    },
  });
  const debt2 = await prisma.debt.create({
    data: {
      user_id: user.id, name: 'Кредитная карта', total_amount: 100000,
      remaining: 35000, interest_rate: 24, monthly_payment: 10000,
      type: 'credit_card', start_date: new Date(2025, 10, 1),
      notes: 'Погасить до конца месяца', is_active: true,
    },
  });
  console.log(`Debts created: 2`);

  // Recurring transactions
  const recurringCat = await getSystemCategory('Пополнение целей');
  const rentCat = await getSystemCategory('Коммуналка');
  await prisma.recurringTransaction.create({
    data: {
      user_id: user.id, category_id: rentCat.id, amount: 5800,
      type: 'expense', day_of_month: 5, start_month: '2025-01',
      comment: 'Квартплата', active: true, scope: 'personal',
    },
  });
  await prisma.recurringTransaction.create({
    data: {
      user_id: user.id, category_id: salaryCat.id, amount: 120000,
      type: 'income', day_of_month: 1, start_month: '2025-01',
      comment: 'Зарплата', active: true, scope: 'personal',
    },
  });
  await prisma.recurringTransaction.create({
    data: {
      user_id: user.id, category_id: recurringCat.id, amount: 30000,
      type: 'expense', day_of_month: 3, start_month: '2025-01',
      comment: 'Авто-пополнение цели "Машина"', active: true, scope: 'personal',
    },
  });
  await prisma.recurringTransaction.create({
    data: {
      user_id: user.id, category_id: healthCat.id, amount: 3500,
      type: 'expense', day_of_month: 10, start_month: '2025-01',
      comment: 'Спортзал', active: true, scope: 'personal',
    },
  });
  console.log('Recurring transactions created: 4');

  // Widget config
  await prisma.userWidgetConfig.create({
    data: {
      user_id: user.id,
      personal_widgets: {
        widgets: ['allocation', 'transactions', 'goals', 'budgets', 'recurring', 'debts', 'safetyPillow'],
      },
      family_widgets: { widgets: ['family-allocation', 'family-transactions', 'family-goals'] },
    },
  });
  console.log('Widget config created');

  // Notification settings
  await prisma.notificationSetting.create({
    data: {
      user_id: user.id,
      remind_upcoming: true,
      notify_goal_reached: true,
      notify_budget_exceeded: true,
      notify_wish_completed: true,
    },
  });
  console.log('Notification settings created');

  // Safety pillow settings
  await prisma.safetyPillowSetting.create({
    data: { user_id: user.id, months: 3 },
  });
  console.log('Safety pillow settings created');

  // Safety pillow snapshots — history for last 12 months
  const snapshotData = [];
  for (let m = 11; m >= 0; m--) {
    const ym = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const nextMonth = new Date(ym.getFullYear(), ym.getMonth() + 1, 1);

    const totals = await prisma.transaction.aggregate({
      where: { user_id: user.id, date: { gte: ym, lt: nextMonth }, scope: 'personal' },
      _sum: { amount: true },
    });
    const incomeRes = await prisma.transaction.aggregate({
      where: { user_id: user.id, date: { gte: ym, lt: nextMonth }, type: 'income', scope: 'personal' },
      _sum: { amount: true },
    });
    const expenseRes = await prisma.transaction.aggregate({
      where: { user_id: user.id, date: { gte: ym, lt: nextMonth }, type: 'expense', scope: 'personal' },
      _sum: { amount: true },
    });

    const totalIncome = Number(incomeRes._sum.amount || 0);
    const totalExpenses = Number(expenseRes._sum.amount || 0);
    const accountSum = await prisma.account.aggregate({
      where: { user_id: user.id, is_active: true, is_liquid: true },
      _sum: { balance: true },
    });
    const liquidFunds = Number(accountSum._sum.balance || 0);

    snapshotData.push({
      user_id: user.id,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      safety_pillow: liquidFunds,
      monthly_limit: totalExpenses,
      calculated_at: nextMonth,
    });
  }
  await prisma.safetyPillowSnapshot.createMany({ data: snapshotData });
  console.log(`Safety pillow snapshots created: ${snapshotData.length}`);

  console.log('\n=== Demo account created! ===');
  console.log(`Email:    ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log('=============================\n');
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
