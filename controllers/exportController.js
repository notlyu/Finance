const ExcelJS = require('exceljs');
const prisma = require('../lib/prisma-client');
const { logger, UnauthorizedError } = require('../lib/errors');

async function getUserTransactions(userId, familyId, query = {}) {
  let whereClause;

  if (familyId) {
    whereClause = {
      OR: [
        { family_id: null, user_id: userId, scope: 'personal' },
        { family_id: familyId, scope: { in: ['family', 'shared'] } }
      ]
    };
  } else {
    whereClause = { family_id: null, user_id: userId, scope: 'personal' };
  }

  if (query.type) whereClause.type = query.type;
  if (query.categoryId) whereClause.category_id = Number(query.categoryId);

  const transactions = await prisma.transaction.findMany({
    where: whereClause,
    include: {
      category: { select: { name: true } },
      user: { select: { name: true } },
      account: { select: { name: true } }
    },
    orderBy: { date: 'desc' }
  });

  return transactions;
}

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@]/.test(str)) {
    str = "'" + str;
  }
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCSV(data, columns) {
  const header = columns.map(c => c.header).join(',');
  const rows = data.map(row =>
    columns.map(c => escapeCSV(row[c.key])).join(',')
  );
  return [header, ...rows].join('\n');
}

async function createExcelWorkbook(data, columns, sheetName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Finance App';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName);

  sheet.addRow(columns.map(c => c.header));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46BE' },
    bgColor: { argb: 'FF4F46BE' }
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.alignment = { horizontal: 'center' };

  data.forEach(row => {
    sheet.addRow(columns.map(c => {
      const value = row[c.key];
      if (c.format === 'money' && value !== null && value !== undefined) {
        return Number(value);
      }
      return value;
    }));
  });

  sheet.columns.forEach(col => {
    col.width = Math.max(col.header?.length || 10, 15);
  });

  return workbook;
}

const transactionColumns = [
  { key: 'date', header: 'Дата' },
  { key: 'type', header: 'Тип' },
  { key: 'category_name', header: 'Категория' },
  { key: 'amount', header: 'Сумма', format: 'money' },
  { key: 'account_name', header: 'Счет' },
  { key: 'user_name', header: 'Автор' },
  { key: 'comment', header: 'Комментарий' },
  { key: 'scope', header: 'Тип (personal/family/shared)' }
];

const wishColumns = [
  { key: 'name', header: 'Название' },
  { key: 'price', header: 'Цена', format: 'money' },
  { key: 'saved_amount', header: 'Накоплено', format: 'money' },
  { key: 'progress', header: 'Прогресс %' },
  { key: 'link', header: 'Ссылка' },
  { key: 'created_at', header: 'Дата создания' }
];

const goalColumns = [
  { key: 'name', header: 'Название' },
  { key: 'target_amount', header: 'Целевая сумма', format: 'money' },
  { key: 'current_amount', header: 'Текущая сумма', format: 'money' },
  { key: 'progress', header: 'Прогресс %' },
  { key: 'deadline', header: 'Дедлайн' },
  { key: 'interest_rate', header: 'Ставка %' },
  { key: 'scope', header: 'Тип' },
  { key: 'is_archived', header: 'Архив' }
];

const budgetColumns = [
  { key: 'category_name', header: 'Категория' },
  { key: 'limit_amount', header: 'Лимит', format: 'money' },
  { key: 'spent_amount', header: 'Потрачено', format: 'money' },
  { key: 'remaining', header: 'Остаток', format: 'money' },
  { key: 'period', header: 'Период' }
];

async function fetchTransactions(user, query) {
  const transactions = await getUserTransactions(user.id, user.family_id, query);
  return transactions.map(t => ({
    date: new Date(t.date).toLocaleDateString('ru-RU'),
    type: t.type === 'income' ? 'Доход' : 'Расход',
    category_name: t.category?.name || '',
    amount: t.amount,
    account_name: t.account?.name || '',
    user_name: t.user?.name || '',
    comment: t.comment || '',
    scope: t.scope || (t.family_id ? 'family' : 'personal')
  }));
}

async function fetchGoals(user) {
  let where;
  if (user.family_id) {
    where = { OR: [{ family_id: user.family_id }, { user_id: user.id, family_id: null }] };
  } else {
    where = { user_id: user.id, family_id: null };
  }

  const goals = await prisma.goal.findMany({
    where,
    include: { family: { select: { name: true } } }
  });

  return goals.map(g => ({
    name: g.name,
    target_amount: g.target_amount,
    current_amount: g.current_amount,
    progress: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0,
    deadline: g.deadline ? new Date(g.deadline).toLocaleDateString('ru-RU') : '',
    interest_rate: g.interest_rate || 0,
    scope: g.scope || (g.family_id ? 'Семейная' : 'Личная'),
    is_archived: g.is_archived ? 'Да' : 'Нет'
  }));
}

async function fetchWishes(user) {
  let where;
  if (user.family_id) {
    where = { OR: [{ family_id: user.family_id }, { user_id: user.id, family_id: null }] };
  } else {
    where = { user_id: user.id };
  }

  const wishes = await prisma.wish.findMany({ where });

  return wishes.map(w => ({
    name: w.name,
    price: w.price,
    saved_amount: w.saved_amount,
    progress: w.price > 0 ? Math.round((w.saved_amount / w.price) * 100) : 0,
    link: w.link || '',
    created_at: new Date(w.created_at).toLocaleDateString('ru-RU')
  }));
}

async function fetchBudgets(user) {
  let where;
  if (user.family_id) {
    where = { family_id: user.family_id };
  } else {
    where = { user_id: user.id, family_id: null };
  }

  const budgets = await prisma.budget.findMany({
    where,
    include: { category: { select: { name: true } } }
  });

  return budgets.map(b => ({
    category_name: b.category?.name || '',
    limit_amount: b.limit_amount,
    spent_amount: b.spent_amount,
    remaining: b.limit_amount - b.spent_amount,
    period: b.period || 'monthly'
  }));
}

function sendFile(res, buffer, filename, format) {
  res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

exports.exportTransactions = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { format = 'xlsx', startDate, endDate, type } = req.query;
    const query = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;
    if (type) query.type = type;

    const data = await fetchTransactions(req.user, query);

    if (format === 'csv') {
      const csv = toCSV(data, transactionColumns);
      sendFile(res, csv, `transactions-${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
    } else {
      const workbook = await createExcelWorkbook(data, transactionColumns, 'Транзакции');
      const buffer = await workbook.xlsx.writeBuffer();
      sendFile(res, buffer, `transactions-${new Date().toISOString().slice(0, 10)}.xlsx`, 'xlsx');
    }

    logger.info({ userId: req.user.id, action: 'exportTransactions', format, count: data.length });
  } catch (error) {
    next(error);
  }
};

exports.exportGoals = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { format = 'xlsx' } = req.query;
    const data = await fetchGoals(req.user);

    if (format === 'csv') {
      const csv = toCSV(data, goalColumns);
      sendFile(res, csv, `goals-${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
    } else {
      const workbook = await createExcelWorkbook(data, goalColumns, 'Цели');
      const buffer = await workbook.xlsx.writeBuffer();
      sendFile(res, buffer, `goals-${new Date().toISOString().slice(0, 10)}.xlsx`, 'xlsx');
    }

    logger.info({ userId: req.user.id, action: 'exportGoals', format, count: data.length });
  } catch (error) {
    next(error);
  }
};

exports.exportWishes = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { format = 'xlsx' } = req.query;
    const data = await fetchWishes(req.user);

    if (format === 'csv') {
      const csv = toCSV(data, wishColumns);
      sendFile(res, csv, `wishes-${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
    } else {
      const workbook = await createExcelWorkbook(data, wishColumns, 'Желания');
      const buffer = await workbook.xlsx.writeBuffer();
      sendFile(res, buffer, `wishes-${new Date().toISOString().slice(0, 10)}.xlsx`, 'xlsx');
    }

    logger.info({ userId: req.user.id, action: 'exportWishes', format, count: data.length });
  } catch (error) {
    next(error);
  }
};

exports.exportAnalytics = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { format = 'xlsx', startDate, endDate } = req.query;
    const user = req.user;
    const familyId = user.family_id;

    const today = new Date();
    let start, end;
    if (startDate && endDate) {
      start = startDate;
      end = endDate;
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - 11, 1).toISOString().slice(0, 10);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 1).toISOString().slice(0, 10);
    }

    const df = { date: { gte: new Date(start), lt: new Date(end) } };
    const where = familyId
      ? { ...df, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { ...df, family_id: null, user_id: user.id };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    let totalIncome = 0, totalExpense = 0;
    const expenseByCat = {};
    const incomeByCat = {};
    transactions.forEach(t => {
      const val = parseFloat(t.amount || 0);
      if (t.type === 'income') {
        totalIncome += val;
        const catName = t.category?.name || 'Без категории';
        incomeByCat[catName] = (incomeByCat[catName] || 0) + val;
      } else {
        totalExpense += val;
        const catName = t.category?.name || 'Без категории';
        expenseByCat[catName] = (expenseByCat[catName] || 0) + val;
      }
    });

    const analyticsColumns = [
      { key: 'metric', header: 'Показатель' },
      { key: 'value', header: 'Значение' },
    ];

    const data = [
      { metric: 'Период с', value: start },
      { metric: 'Период по', value: end },
      { metric: 'Всего доходов', value: totalIncome, format: 'money' },
      { metric: 'Всего расходов', value: totalExpense, format: 'money' },
      { metric: 'Баланс', value: totalIncome - totalExpense, format: 'money' },
      { metric: '', value: '' },
      { metric: '--- Расходы по категориям ---', value: '' },
    ];

    Object.entries(expenseByCat)
      .sort(([, a], [, b]) => b - a)
      .forEach(([name, total]) => {
        data.push({ metric: name, value: total, format: 'money' });
      });

    data.push({ metric: '', value: '' });
    data.push({ metric: '--- Доходы по категориям ---', value: '' });
    Object.entries(incomeByCat)
      .sort(([, a], [, b]) => b - a)
      .forEach(([name, total]) => {
        data.push({ metric: name, value: total, format: 'money' });
      });

    if (format === 'csv') {
      const csv = toCSV(data, analyticsColumns);
      sendFile(res, csv, `analytics-${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
    } else {
      const workbook = await createExcelWorkbook(data, analyticsColumns, 'Аналитика');
      const buffer = await workbook.xlsx.writeBuffer();
      sendFile(res, buffer, `analytics-${new Date().toISOString().slice(0, 10)}.xlsx`, 'xlsx');
    }
  } catch (error) {
    next(error);
  }
};

exports.exportBudgets = async (req, res, next) => {
  try {
    if (!req.user) throw new UnauthorizedError();

    const { format = 'xlsx' } = req.query;
    const data = await fetchBudgets(req.user);

    if (format === 'csv') {
      const csv = toCSV(data, budgetColumns);
      sendFile(res, csv, `budgets-${new Date().toISOString().slice(0, 10)}.csv`, 'csv');
    } else {
      const workbook = await createExcelWorkbook(data, budgetColumns, 'Бюджеты');
      const buffer = await workbook.xlsx.writeBuffer();
      sendFile(res, buffer, `budgets-${new Date().toISOString().slice(0, 10)}.xlsx`, 'xlsx');
    }

    logger.info({ userId: req.user.id, action: 'exportBudgets', format, count: data.length });
  } catch (error) {
    next(error);
  }
};