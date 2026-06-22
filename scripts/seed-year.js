const prisma = require('../lib/prisma-client');
const bcrypt = require('bcrypt');

const USER_EMAIL = 'demo@finance.app';
const USER_PASSWORD = 'demo1234';
const USER_NAME = 'Демо пользователь';

const START_DATE = new Date('2025-06-01');
const END_DATE = new Date('2026-06-09');
const MONTHS = 13;

function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(...items) {
  return items[Math.floor(Math.random() * items.length)];
}

async function seed() {
  try {
    console.log('🌱 Seeding year-long demo data...\n');

    const passwordHash = await bcrypt.hash(USER_PASSWORD, 10);

    let user = await prisma.user.findUnique({ where: { email: USER_EMAIL } });
    if (user) {
      console.log('User already exists, cleaning old data...');
      await prisma.goalContribution.deleteMany({ where: { goal: { user_id: user.id } } });
      await prisma.wishContribution.deleteMany({ where: { wish: { user_id: user.id } } });
      await prisma.transaction.deleteMany({ where: { user_id: user.id } });
      await prisma.goal.deleteMany({ where: { user_id: user.id } });
      await prisma.wish.deleteMany({ where: { user_id: user.id } });
      await prisma.budget.deleteMany({ where: { user_id: user.id } });
      await prisma.recurringTransaction.deleteMany({ where: { user_id: user.id } });
      await prisma.debt.deleteMany({ where: { user_id: user.id } });
      await prisma.notification.deleteMany({ where: { user_id: user.id } });
      await prisma.notificationSetting.deleteMany({ where: { user_id: user.id } });
      await prisma.safetyPillowSetting.deleteMany({ where: { user_id: user.id } });
      await prisma.safetyPillowSnapshot.deleteMany({ where: { user_id: user.id } });
      await prisma.safetyPillowHistory.deleteMany({ where: { user_id: user.id } });
      await prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } });
      await prisma.account.deleteMany({ where: { user_id: user.id } });
      await prisma.category.deleteMany({ where: { user_id: user.id } });
      await prisma.userWidgetConfig.deleteMany({ where: { user_id: user.id } });
      await prisma.familyMember.deleteMany({ where: { user_id: user.id } });

      user = await prisma.user.update({
        where: { id: user.id },
        data: { password_hash: passwordHash, name: USER_NAME, family_id: null },
      });
    } else {
      user = await prisma.user.create({
        data: { email: USER_EMAIL, password_hash: passwordHash, name: USER_NAME },
      });
      console.log(`Created user: ${USER_NAME} (id=${user.id})`);
    }

    // Личный-только аккаунт: семья не создаётся (family_id остаётся null).

    const catData = [
      { name: 'Зарплата', type: 'income', is_system: true },
      { name: 'Фриланс', type: 'income', is_system: true },
      { name: 'Подработка', type: 'income', is_system: true },
      { name: 'Продукты', type: 'expense', is_system: true },
      { name: 'Транспорт', type: 'expense', is_system: true },
      { name: 'Коммуналка', type: 'expense', is_system: true },
      { name: 'Кафе', type: 'expense', is_system: true },
      { name: 'Развлечения', type: 'expense', is_system: true },
      { name: 'Одежда', type: 'expense', is_system: true },
      { name: 'Здоровье', type: 'expense', is_system: true },
      { name: 'Связь', type: 'expense', is_system: true },
      { name: 'Подарки', type: 'expense', is_system: true },
      { name: 'Другое', type: 'expense', is_system: true },
    ];

    const cats = {};
    for (const c of catData) {
      let cat = await prisma.category.findFirst({ where: { name: c.name, type: c.type, is_system: true } });
      if (!cat) {
        cat = await prisma.category.create({ data: c });
      }
      cats[c.name] = cat;
    }
    console.log(`Categories: ${Object.keys(cats).length}`);

    const accountsConfig = [
      { name: 'Дебетовая карта', type: 'debit', balance: 420000.0 },
      { name: 'Накопительный', type: 'savings', balance: 250000.0 },
      { name: 'Кредитная карта', type: 'credit', balance: -15000.0 },
      { name: 'Наличные', type: 'cash', balance: 35000.0 },
    ];

    const accounts = {};
    for (const acct of accountsConfig) {
      const a = await prisma.account.create({
        data: {
          user_id: user.id,
          name: acct.name,
          type: acct.type,
          balance: acct.balance,
          currency: 'RUB',
          is_active: true,
          is_liquid: acct.type !== 'savings',
          scope: 'personal',
        },
      });
      accounts[acct.name] = a;
    }
    console.log(`Accounts: ${accountsConfig.length}`);

    const salaryMonths = {};

    for (let m = 0; m < MONTHS; m++) {
      const monthStart = addMonths(START_DATE, m);
      if (monthStart > END_DATE) break;

      const txs = [];

      const salary = pick(75000, 80000, 85000, 78000, 82000);
      const day = monthStart.getDate() <= 10 ? monthStart.getDate() : 5;
      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: salary,
        type: 'income',
        category_id: cats['Зарплата'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), Math.min(day, 10)),
        comment: 'Зарплата',
        scope: 'personal',
      });
      salaryMonths[`${monthStart.getFullYear()}-${monthStart.getMonth()}`] = salary;

      const freelance = pick(0, 0, 12000, 0, 8000, 15000, 0, 10000);
      if (freelance > 0) {
        txs.push({
          user_id: user.id,
          account_id: accounts['Дебетовая карта'].id,
          amount: freelance,
          type: 'income',
          category_id: cats['Фриланс'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(15, 25)),
          comment: pick('Вёрстка сайта', 'Настройка рекламы', 'Консультация', 'Дизайн макета'),
          scope: 'personal',
        });
      }

      const food = randomInt(8000, 15000);
      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: food, type: 'expense',
        category_id: cats['Продукты'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(1, 5)),
        comment: 'Продукты на неделю', scope: 'personal',
      });

      txs.push({
        user_id: user.id,
        account_id: accounts['Наличные'].id,
        amount: randomInt(3000, 7000), type: 'expense',
        category_id: cats['Продукты'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(15, 20)),
        comment: 'Продукты', scope: 'personal',
      });

      const utilities = randomInt(4500, 6500);
      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: utilities, type: 'expense',
        category_id: cats['Коммуналка'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(1, 10)),
        comment: 'Квартплата', scope: 'personal',
      });

      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: randomInt(500, 1000), type: 'expense',
        category_id: cats['Связь'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(1, 10)),
        comment: 'Мобильная связь + интернет', scope: 'personal',
      });

      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: randomInt(1200, 2500), type: 'expense',
        category_id: cats['Транспорт'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(1, 5)),
        comment: pick('Проездной', 'Бензин', 'Метро'), scope: 'personal',
      });

      txs.push({
        user_id: user.id,
        account_id: accounts['Дебетовая карта'].id,
        amount: randomInt(1500, 4000), type: 'expense',
        category_id: cats['Транспорт'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(15, 25)),
        comment: pick('Такси', 'Бензин', 'Парковка'), scope: 'personal',
      });

      const cafeCount = randomInt(2, 5);
      for (let c = 0; c < cafeCount; c++) {
        txs.push({
          user_id: user.id,
          account_id: pick(accounts['Дебетовая карта'].id, accounts['Наличные'].id),
          amount: randomInt(300, 1200), type: 'expense',
          category_id: cats['Кафе'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(5, 28)),
          comment: pick('Кофе', 'Обед', 'Ужин', 'Бизнес-ланч'), scope: 'personal',
        });
      }

      const fun = randomInt(0, 3);
      for (let f = 0; f < fun; f++) {
        txs.push({
          user_id: user.id,
          account_id: accounts['Дебетовая карта'].id,
          amount: randomInt(500, 3000), type: 'expense',
          category_id: cats['Развлечения'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(8, 28)),
          comment: pick('Кино', 'Театр', 'Концерт', 'Стриминг', 'Игры', 'Подписка'), scope: 'personal',
        });
      }

      const clothing = Math.random() < 0.3;
      if (clothing) {
        txs.push({
          user_id: user.id,
          account_id: accounts['Кредитная карта'].id,
          amount: randomInt(2000, 8000), type: 'expense',
          category_id: cats['Одежда'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(10, 25)),
          comment: pick('Кроссовки', 'Футболка', 'Джинсы', 'Куртка'), scope: 'personal',
        });
      }

      const health = Math.random() < 0.25;
      if (health) {
        txs.push({
          user_id: user.id,
          account_id: accounts['Дебетовая карта'].id,
          amount: randomInt(500, 3000), type: 'expense',
          category_id: cats['Здоровье'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(5, 20)),
          comment: pick('Аптека', 'Витамины', 'Спортзал', 'Массаж'), scope: 'personal',
        });
      }

      const gifts = Math.random() < 0.2;
      if (gifts) {
        txs.push({
          user_id: user.id,
          account_id: accounts['Дебетовая карта'].id,
          amount: randomInt(1000, 5000), type: 'expense',
          category_id: cats['Подарки'].id,
          date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(1, 28)),
          comment: pick('ДР друга', 'Подарок маме', 'Сюрприз'), scope: 'personal',
        });
      }

      txs.push({
        user_id: user.id,
        account_id: accounts['Кредитная карта'].id,
        amount: randomInt(300, 800), type: 'expense',
        category_id: cats['Другое'].id,
        date: new Date(monthStart.getFullYear(), monthStart.getMonth(), randomInt(20, 28)),
        comment: pick('Разное', 'Мелкие расходы', 'Подписка'), scope: 'personal',
      });

      await prisma.transaction.createMany({ data: txs });
    }
    console.log(`Transactions: ~${MONTHS * 15}+ created`);

    const goalData = [
      {
        name: 'Путешествие в Таиланд',
        target: 200000,
        current: 65000,
        deadline: 12,
        auto_contribute_type: 'percentage',
        auto_contribute_value: 5,
      },
      {
        name: 'Новый MacBook',
        target: 120000,
        current: 45000,
        deadline: 6,
        auto_contribute_type: null,
        auto_contribute_value: null,
      },
      {
        name: 'Ремонт в спальне',
        target: 150000,
        current: 20000,
        deadline: 8,
        auto_contribute_type: 'fixed',
        auto_contribute_value: 5000,
      },
    ];

    for (const g of goalData) {
      await prisma.goal.create({
        data: {
          user_id: user.id,
          family_id: null,
          name: g.name,
          target_amount: g.target,
          current_amount: g.current,
          deadline: addMonths(new Date(), g.deadline),
          is_archived: false,
          auto_contribute_enabled: !!g.auto_contribute_type,
          auto_contribute_type: g.auto_contribute_type,
          auto_contribute_value: g.auto_contribute_value,
        },
      });
    }
    console.log(`Goals: ${goalData.length}`);

    const wishData = [
      { name: 'Apple Watch', cost: 35000, saved: 12000, priority: 1 },
      { name: 'Игровая консоль', cost: 50000, saved: 0, priority: 2 },
      { name: 'Новая кофеварка', cost: 8000, saved: 8000, priority: 5 },
    ];

    for (const w of wishData) {
      await prisma.wish.create({
        data: {
          user_id: user.id,
          name: w.name,
          cost: w.cost,
          saved_amount: w.saved,
          priority: w.priority,
          status: w.saved >= w.cost ? 'completed' : 'active',
        },
      });
    }
    console.log(`Wishes: ${wishData.length}`);

    await prisma.safetyPillowSetting.upsert({
      where: { user_id: user.id },
      update: { months: 6 },
      create: { user_id: user.id, months: 6 },
    });

    const snapshots = [];
    for (let m = 0; m < 12; m++) {
      const d = addMonths(new Date('2025-07-01'), m);
      snapshots.push({
        user_id: user.id,
        total_income: randomInt(80000, 100000),
        total_expenses: randomInt(45000, 65000),
        safety_pillow: randomInt(150000, 250000),
        monthly_limit: randomInt(50000, 70000),
        calculated_at: d,
      });
    }
    await prisma.safetyPillowSnapshot.createMany({ data: snapshots });

    const historyData = snapshots.map(({ monthly_limit, ...rest }) => rest);
    await prisma.safetyPillowHistory.createMany({ data: historyData });
    console.log(`Safety pillow snapshots: ${snapshots.length}`);

    const recurringData = [
      { type: 'expense', amount: 1200, category: 'Транспорт', day: 1, start: '2025-06', comment: 'Проездной' },
      { type: 'income', amount: 5000, category: 'Подработка', day: 15, start: '2025-07', comment: 'Репетиторство' },
      { type: 'expense', amount: 450, category: 'Развлечения', day: 8, start: '2025-06', comment: 'Музыкальная подписка' },
    ];

    for (const r of recurringData) {
      await prisma.recurringTransaction.create({
        data: {
          user_id: user.id,
          account_id: accounts['Дебетовая карта'].id,
          type: r.type,
          amount: r.amount,
          category_id: cats[r.category].id,
          day_of_month: r.day,
          start_month: r.start,
          active: true,
          comment: r.comment,
        },
      });
    }
    console.log(`Recurring: ${recurringData.length}`);

    const debtData = [
      { name: 'Кредитная карта', total: 50000, remaining: 15000, rate: 24.0, monthly: 3000, type: 'credit', start: '2025-08-01', end: '2026-08-01' },
      { name: 'Рассрочка на телефон', total: 60000, remaining: 25000, rate: 0, monthly: 5000, type: 'installment', start: '2025-10-01', end: '2026-04-01' },
    ];

    for (const d of debtData) {
      await prisma.debt.create({
        data: {
          user_id: user.id,
          name: d.name,
          total_amount: d.total,
          remaining: d.remaining,
          interest_rate: d.rate,
          monthly_payment: d.monthly,
          type: d.type,
          debt_type: 'loan',
          start_date: new Date(d.start),
          end_date: new Date(d.end),
          is_active: true,
        },
      });
    }
    console.log(`Debts: ${debtData.length}`);

    const budgetCategories = ['Продукты', 'Транспорт', 'Кафе', 'Развлечения'];
    for (let m = 0; m < 6; m++) {
      const monthStr = addMonths(new Date('2026-01-01'), m).toISOString().slice(0, 7);
      for (const catName of budgetCategories) {
        const existing = await prisma.budget.findFirst({
          where: { user_id: user.id, category_id: cats[catName].id, month: monthStr, family_id: null },
        });
        if (!existing) {
          await prisma.budget.create({
            data: {
              user_id: user.id,
              category_id: cats[catName].id,
              month: monthStr,
              limit_amount: catName === 'Продукты' ? 15000 :
                catName === 'Транспорт' ? 5000 :
                catName === 'Кафе' ? 6000 : 5000,
              type: 'expense',
            },
          });
        }
      }
    }
    console.log(`Budgets: ${budgetCategories.length * 6}`);

    const widgetConfig = {
      personal_widgets: [
        { id: 'w1', type: 'allocation', order: 0, span: 4 },
        { id: 'w2', type: 'transactions', order: 1, span: 8 },
        { id: 'w3', type: 'goals', order: 2, span: 7 },
        { id: 'w4', type: 'budgets', order: 3, span: 5 },
        { id: 'w5', type: 'recurring', order: 4, span: 4 },
        { id: 'w6', type: 'debts', order: 5, span: 4 },
        { id: 'w7', type: 'safetyPillow', order: 6, span: 4 },
        { id: 'w8', type: 'analytics', order: 7, span: 12 },
      ],
      family_widgets: [
        { id: 'fw1', type: 'memberStats', order: 0, span: 5 },
        { id: 'fw2', type: 'family', order: 1, span: 6 },
      ],
    };

    await prisma.userWidgetConfig.upsert({
      where: { user_id: user.id },
      update: { personal_widgets: widgetConfig.personal_widgets, family_widgets: widgetConfig.family_widgets },
      create: { user_id: user.id, ...widgetConfig },
    });
    console.log('Widget config created');

    console.log('\n✅ Годовая статистика загружена!');
    console.log('   Email: demo@finance.app');
    console.log('   Пароль: demo1234\n');
  } catch (err) {
    console.error('❌ Ошибка:', err);
    await prisma.$disconnect().catch(() => {});
    if (prisma.pool) await prisma.pool.end().catch(() => {});
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
    if (prisma.pool) await prisma.pool.end().catch(() => {});
  }
}

// Пул pg создан с allowExitOnIdle:false — закрываем явно и выходим, чтобы не зависнуть.
seed().then(() => process.exit(0));
