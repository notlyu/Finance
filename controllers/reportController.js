const prisma = require('../lib/prisma-client');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { logger, ForbiddenError } = require('../lib/errors');
const { isFamilyTransparent } = require('../services/transactionService');

function toMonthKeyFromDateOnly(dateOnly) {
  const d = dateOnly instanceof Date ? dateOnly : new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

exports.getDynamics = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let start, end;
    if (!req.query.startDate && !req.query.endDate) {
      const s = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      start = s.toISOString().slice(0, 10);
      end = e.toISOString().slice(0, 10);
    } else {
      start = req.query.startDate ? String(req.query.startDate) : new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      end = req.query.endDate ? String(req.query.endDate) : todayStr;
    }
    const defaultRange = { start: start, end: end, today: todayStr };
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    if (memberId && familyId) {
      const member = await prisma.user.findUnique({ where: { id: memberId } });
      if (!member || member.family_id !== familyId) {
        throw new ForbiddenError('Доступ запрещён');
      }
    } else if (memberId && !familyId) {
      if (memberId !== user.id) {
        throw new ForbiddenError('Доступ запрещён');
      }
    }

    let where;
    const dateFilter = { date: { gte: new Date(start), lt: new Date(endExclusive.toISOString().slice(0, 10)) } };
    if (memberId) {
      where = familyId
        ? {
            ...dateFilter,
            OR: [
              { family_id: familyId, user_id: memberId },
              { family_id: null, user_id: memberId },
            ]
          }
        : { ...dateFilter, family_id: null, user_id: memberId };
    } else {
      where = familyId
        ? {
            ...dateFilter,
            OR: [
              { family_id: familyId },
              { family_id: null, user_id: user.id },
            ]
          }
        : { ...dateFilter, family_id: null, user_id: user.id };
    }
    const rows = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    const months = [];
    const incomeByMonth = {};
    const expenseByMonth = {};

    const startD = new Date(`${start}T00:00:00`);
    const endD = new Date(`${end}T00:00:00`);
    const cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
    const endCursor = new Date(endD.getFullYear(), endD.getMonth() + 1, 1);
    while (cursor < endCursor) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      incomeByMonth[key] = 0;
      expenseByMonth[key] = 0;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    rows.forEach(r => {
      const monthKey = toMonthKeyFromDateOnly(r.date);
      if (!monthKey) return;
      const val = parseFloat(r.amount || 0);
      if (r.type === 'income') incomeByMonth[monthKey] = (incomeByMonth[monthKey] || 0) + val;
      if (r.type === 'expense') expenseByMonth[monthKey] = (expenseByMonth[monthKey] || 0) + val;
    });

    logger.info(`User ${user.id} got dynamics report`);
    res.json({
      startDate: start,
      endDate: end,
      labels: months.map(m => {
        const [year, month] = m.split('-');
        return `${month}.${year}`;
      }),
      income: months.map(m => incomeByMonth[m]),
      expense: months.map(m => expenseByMonth[m]),
      defaultRange
    });
  } catch (error) {
    next(error);
  }
};

exports.getExpensesByCategory = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { startDate, endDate } = req.query;
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    if (memberId && familyId) {
      const member = await prisma.user.findUnique({ where: { id: memberId } });
      if (!member || member.family_id !== familyId) {
        throw new ForbiddenError('Доступ запрещён');
      }
    } else if (memberId && !familyId) {
      if (memberId !== user.id) {
        throw new ForbiddenError('Доступ запрещён');
      }
    }

    const dateFilter = {};
    if (startDate && endDate) dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    else if (startDate) dateFilter.date = { gte: new Date(startDate) };
    else if (endDate) dateFilter.date = { lte: new Date(endDate) };

    let where;
    if (memberId) {
      where = familyId
        ? { type: 'expense', ...dateFilter, OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
        : { type: 'expense', ...dateFilter, family_id: null, user_id: memberId };
    } else {
      where = familyId
        ? { type: 'expense', ...dateFilter, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { type: 'expense', ...dateFilter, family_id: null, user_id: user.id };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.category?.name || 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    logger.info(`User ${user.id} got expenses by category`);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.getIncomeByCategory = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { startDate, endDate } = req.query;
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    if (memberId && familyId) {
      const member = await prisma.user.findUnique({ where: { id: memberId } });
      if (!member || member.family_id !== familyId) {
        throw new ForbiddenError('Доступ запрещён');
      }
    } else if (memberId && !familyId) {
      if (memberId !== user.id) {
        throw new ForbiddenError('Доступ запрещён');
      }
    }

    const dateFilter = {};
    if (startDate && endDate) dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    else if (startDate) dateFilter.date = { gte: new Date(startDate) };
    else if (endDate) dateFilter.date = { lte: new Date(endDate) };

    let where;
    if (memberId) {
      where = familyId
        ? { type: 'income', ...dateFilter, OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
        : { type: 'income', ...dateFilter, family_id: null, user_id: memberId };
    } else {
      where = familyId
        ? { type: 'income', ...dateFilter, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { type: 'income', ...dateFilter, family_id: null, user_id: user.id };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.category?.name || 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    logger.info(`User ${user.id} got income by category`);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { startDate, endDate, limit = 10000, offset = 0 } = req.query;
    const dateFilter = {};
    if (startDate && endDate) dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    else if (startDate) dateFilter.date = { gte: new Date(startDate) };
    else if (endDate) dateFilter.date = { lte: new Date(endDate) };

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }], ...dateFilter }
      : { family_id: null, user_id: user.id, ...dateFilter };

    const safeLimit = Math.min(Number(limit) || 10000, 50000);
    const safeOffset = Number(offset) || 0;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true, user: true },
        orderBy: { date: 'desc' },
        take: safeLimit,
        skip: safeOffset,
      }),
      prisma.transaction.count({ where }),
    ]);

    const header = ['Дата','Тип','Сумма','Категория','Автор','Комментарий','Семейная','Скрытая'];
    const formatDate = (d) => {
      const date = new Date(d);
      return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
    };
    const rows = transactions.map(t => [
      formatDate(t.date),
      t.type === 'income' ? 'Доход' : 'Расход',
      t.amount,
      t.category?.name ?? '',
      t.user?.name ?? '',
      t.comment ?? '',
      t.family_id ? 'Да' : 'Нет',
      t.scope || (t.family_id ? 'family' : 'personal')
    ]);
    const csv = '\ufeff' + [header.join(','), ...rows.map(r => r.map(v => {
      if (v == null) return '';
      let s = String(v);
      if (/^[=+\-@]/.test(s)) {
        s = "'" + s;
      }
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(','))].join('\n');

    logger.info(`User ${user.id} exported ${transactions.length}/${total} transactions as CSV (limit=${safeLimit}, offset=${safeOffset})`);

    if (total > safeLimit) {
      res.json({
        total,
        exported: transactions.length,
        offset,
        limit: safeLimit,
        hasMore: safeOffset + transactions.length < total,
        csv,
      });
    } else {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.send(csv);
    }
  } catch (error) {
    next(error);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    else if (startDate) dateFilter.date = { gte: new Date(startDate) };
    else if (endDate) dateFilter.date = { lte: new Date(endDate) };

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }], ...dateFilter }
      : { family_id: null, user_id: user.id, ...dateFilter };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, user: true },
      orderBy: { date: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Операции');

    sheet.columns = [
      { header: 'Дата', key: 'date', width: 12 },
      { header: 'Тип', key: 'type', width: 10 },
      { header: 'Категория', key: 'category', width: 20 },
      { header: 'Сумма (₽)', key: 'amount', width: 15 },
      { header: 'Автор', key: 'user', width: 15 },
      { header: 'Комментарий', key: 'comment', width: 30 },
    ];

    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    // Маскируем ТОЛЬКО чужое личное (scope='personal'), не семейное.
    // В режиме прозрачности семьи — не маскируем.
    const transparent = await isFamilyTransparent(familyId);
    transactions.forEach(t => {
      const isHidden = !transparent && t.scope === 'personal' && t.user_id !== user.id;
      sheet.addRow({
        date: t.date,
        type: t.type === 'income' ? 'Доход' : 'Расход',
        category: isHidden ? '🔒 Сюрприз' : (t.category?.name || ''),
        amount: isHidden ? 0 : Number(t.amount),
        user: t.user?.name || '',
        comment: isHidden ? '' : (t.comment || ''),
      });
    });

    sheet.getColumn('amount').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    logger.info(`User ${user.id} exported ${transactions.length} transactions as Excel`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

exports.getComparison = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const comparisonType = req.query.type || 'mom'; // 'mom' or 'yoy'

    const today = new Date();
    const currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const currentEndStr = currentEnd.toISOString().slice(0, 10);
    let currentStart, prevStart, prevEnd;

    if (comparisonType === 'mom') {
      currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 1);
      prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevEnd = prevMonthEnd;
    } else {
      currentStart = new Date(today.getFullYear(), today.getMonth(), 1);
      prevStart = new Date(today.getFullYear() - 1, today.getMonth(), 1);
      prevEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    }

    const currentStartStr = currentStart.toISOString().slice(0, 10);
    const prevStartStr = prevStart.toISOString().slice(0, 10);
    const prevEndStr = prevEnd.toISOString().slice(0, 10);

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    const buildWhere = (start, end) => {
      const df = { date: { gte: new Date(start), lt: new Date(end) } };
      if (memberId) {
        return familyId
          ? { ...df, OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
          : { ...df, family_id: null, user_id: memberId };
      }
      return familyId
        ? { ...df, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { ...df, family_id: null, user_id: user.id };
    };

    const [currentTx, prevTx] = await Promise.all([
      prisma.transaction.findMany({ where: buildWhere(currentStartStr, currentEndStr), include: { category: true } }),
      prisma.transaction.findMany({ where: buildWhere(prevStartStr, prevEndStr), include: { category: true } }),
    ]);

    const calcTotals = (txs) => {
      let income = 0, expense = 0;
      const byCategory = {};
      txs.forEach(t => {
        const val = parseFloat(t.amount || 0);
        if (t.type === 'income') income += val;
        else expense += val;
        const catName = t.category?.name || 'Без категории';
        byCategory[catName] = (byCategory[catName] || 0) + val;
      });
      return { income, expense, byCategory };
    };

    const current = calcTotals(currentTx);
    const prev = calcTotals(prevTx);

    const pctChange = (curr, prev) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : null;

    res.json({
      type: comparisonType,
      current: {
        startDate: currentStartStr,
        endDate: currentEndStr,
        income: current.income,
        expense: current.expense,
        categories: Object.entries(current.byCategory).map(([name, total]) => ({ name, total })),
      },
      previous: {
        startDate: prevStartStr,
        endDate: prevEndStr,
        income: prev.income,
        expense: prev.expense,
        categories: Object.entries(prev.byCategory).map(([name, total]) => ({ name, total })),
      },
      changes: {
        income: pctChange(current.income, prev.income),
        expense: pctChange(current.expense, prev.expense),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getNetWorth = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const monthsBack = Number(req.query.months) || 12;

    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - (monthsBack - 1), 1);
    const startStr = startDate.toISOString().slice(0, 10);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const endStr = endDate.toISOString().slice(0, 10);

    const accountWhere = familyId
      ? { OR: [{ family_id: familyId, is_active: true }, { family_id: null, user_id: user.id, is_active: true }] }
      : { user_id: user.id, family_id: null, is_active: true };
    const debtWhere = familyId
      ? { OR: [{ family_id: familyId, is_active: true }, { family_id: null, user_id: user.id, is_active: true }] }
      : { user_id: user.id, family_id: null, is_active: true };

    const [accounts, debts, transactions] = await Promise.all([
      prisma.account.findMany({ where: accountWhere, select: { balance: true } }),
      prisma.debt.findMany({ where: debtWhere, select: { remaining: true } }),
      (() => {
        const txWhere = familyId
          ? { date: { gte: new Date(startStr), lt: new Date(endStr) }, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
          : { date: { gte: new Date(startStr), lt: new Date(endStr) }, family_id: null, user_id: user.id };
        return prisma.transaction.findMany({ where: txWhere, orderBy: { date: 'asc' } });
      })(),
    ]);

    const currentAssets = accounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    const currentLiabilities = debts.reduce((s, d) => s + Number(d.remaining || 0), 0);
    const currentNetWorth = currentAssets - currentLiabilities;

    const monthlyData = {};
    const cursor = new Date(startDate);
    while (cursor < endDate) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { income: 0, expense: 0 };
      cursor.setMonth(cursor.getMonth() + 1);
    }

    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        const val = parseFloat(t.amount || 0);
        if (t.type === 'income') monthlyData[key].income += val;
        else monthlyData[key].expense += val;
      }
    });

    let cumulativeCashFlow = 0;
    const labels = Object.keys(monthlyData);
    const savingsRates = [];
    const cashFlowData = labels.map((key) => {
      const d = monthlyData[key];
      cumulativeCashFlow += d.income - d.expense;
      const savings = d.income > 0 ? Math.round(((d.income - d.expense) / d.income) * 100) : 0;
      savingsRates.push(savings);
      return {
        month: key,
        label: `${key.split('-')[1]}.${key.split('-')[0]}`,
        income: d.income,
        expense: d.expense,
        cashFlow: cumulativeCashFlow,
        netWorth: currentAssets + cumulativeCashFlow - currentLiabilities,
        savingsRate: savings,
      };
    });

    res.json({
      currentAssets,
      currentLiabilities,
      currentNetWorth,
      currentSavingsRate: cashFlowData.length > 0 ? cashFlowData[cashFlowData.length - 1].savingsRate : 0,
      monthly: cashFlowData,
    });
  } catch (error) {
    next(error);
  }
};

exports.getCategoryTransactions = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { categoryName, startDate, endDate, type } = req.query;

    if (!categoryName) {
      return res.json([]);
    }

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate + 'T23:59:59.999Z') };
    }

    let where;
    if (memberId) {
      where = familyId
        ? { ...dateFilter, OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
        : { ...dateFilter, family_id: null, user_id: memberId };
    } else {
      where = familyId
        ? { ...dateFilter, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { ...dateFilter, family_id: null, user_id: user.id };
    }

    if (type) where.type = type;

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, user: { select: { name: true } } },
      orderBy: { date: 'desc' },
      take: 200,
    });

    const filtered = transactions.filter(t =>
      (t.category?.name || 'Без категории') === categoryName
    );

    res.json(filtered.map(t => ({
      id: t.id,
      date: t.date,
      amount: t.amount,
      type: t.type,
      comment: t.comment,
      categoryName: t.category?.name || 'Без категории',
      userName: t.user?.name || '',
    })));
  } catch (error) {
    next(error);
  }
};

exports.getForecast = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);

    const memberId = req.query.memberId ? Number(req.query.memberId) : null;

    const buildWhere = (start, end, types) => {
      const df = { date: { gte: start, lt: end } };
      if (types) df.type = { in: types };
      if (memberId) {
        return familyId
          ? { ...df, OR: [{ family_id: familyId, user_id: memberId }, { family_id: null, user_id: memberId }] }
          : { ...df, family_id: null, user_id: memberId };
      }
      return familyId
        ? { ...df, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
        : { ...df, family_id: null, user_id: user.id };
    };

    const [currentMonthTx, historicalTx] = await Promise.all([
      prisma.transaction.findMany({
        where: buildWhere(currentMonthStart, currentMonthEnd),
      }),
      prisma.transaction.findMany({
        where: buildWhere(threeMonthsAgo, currentMonthStart),
      }),
    ]);

    const calcTotal = (txs) => {
      let income = 0, expense = 0;
      txs.forEach(t => {
        const val = parseFloat(t.amount || 0);
        if (t.type === 'income') income += val;
        else expense += val;
      });
      return { income, expense };
    };

    const current = calcTotal(currentMonthTx);
    const historical = calcTotal(historicalTx);

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysPassed = today.getDate();
    const daysRemaining = daysInMonth - daysPassed + 1;

    const avgMonthlyExpense = historical.expense / 3;
    const avgMonthlyIncome = historical.income / 3;
    const dailyRate = current.expense / daysPassed;
    const projectedExpense = current.expense + (dailyRate * daysRemaining);
    const projectedIncome = current.income + ((avgMonthlyIncome / daysInMonth) * daysRemaining);

    res.json({
      currentMonth: {
        income: current.income,
        expense: current.expense,
        daysPassed,
        daysRemaining,
        daysInMonth,
      },
      historicalAverage: {
        monthlyIncome: Math.round(avgMonthlyIncome),
        monthlyExpense: Math.round(avgMonthlyExpense),
      },
      forecast: {
        projectedIncome: Math.round(projectedIncome),
        projectedExpense: Math.round(projectedExpense),
        projectedSurplus: Math.round(projectedIncome - projectedExpense),
        confidence: daysPassed > 15 ? 'high' : daysPassed > 7 ? 'medium' : 'low',
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.exportPDF = async (req, res, next) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) dateFilter.date = { gte: new Date(startDate), lte: new Date(endDate) };
    else if (startDate) dateFilter.date = { gte: new Date(startDate) };
    else if (endDate) dateFilter.date = { lte: new Date(endDate) };

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }], ...dateFilter }
      : { family_id: null, user_id: user.id, ...dateFilter };

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true, user: true },
      orderBy: { date: 'desc' },
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.pdf"');
    doc.pipe(res);

    doc.fontSize(20).font('Helvetica-Bold').text('Финансовый отчёт', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica').text(`Период: ${startDate || 'начало'} - ${endDate || 'сегодня'}`, { align: 'center' });
    doc.fontSize(10).text(`Сгенерирован: ${new Date().toLocaleString('ru-RU')}`, { align: 'center' });
    doc.fontSize(10).text(`Пользователь: ${user.name}`, { align: 'center' });
    doc.moveDown(2);

    const totals = { income: 0, expense: 0 };
    transactions.forEach(t => {
      if (t.type === 'income') totals.income += parseFloat(t.amount);
      else totals.expense += parseFloat(t.amount);
    });

    doc.fontSize(12).font('Helvetica-Bold').text('Итого:', 50);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Доходы: ${totals.income.toLocaleString('ru-RU')} ₽`);
    doc.text(`Расходы: ${totals.expense.toLocaleString('ru-RU')} ₽`);
    doc.text(`Баланс: ${(totals.income - totals.expense).toLocaleString('ru-RU')} ₽`);
    doc.moveDown(2);

    const tableTop = doc.y;
    const tableHeaders = ['Дата', 'Тип', 'Категория', 'Сумма'];
    const columnWidths = [80, 60, 180, 100];
    const rowHeight = 20;

    let x = 50;
    doc.font('Helvetica-Bold').fontSize(9);
    tableHeaders.forEach((header, i) => {
      doc.text(header, x, tableTop, { width: columnWidths[i], align: 'left' });
      x += columnWidths[i];
    });

    doc.moveTo(50, tableTop + rowHeight - 5, 570, tableTop + rowHeight - 5);
    doc.stroke();

    doc.font('Helvetica').fontSize(8);
    let y = tableTop + rowHeight;
    const maxRows = 50;
    let visibleCount = 0;

    // Маскируем ТОЛЬКО чужое личное (scope='personal'); семейное видно обоим.
    // В режиме прозрачности — не маскируем.
    const transparent = await isFamilyTransparent(familyId);
    for (const t of transactions) {
      if (visibleCount >= maxRows) break;
      const isHidden = !transparent && t.scope === 'personal' && t.user_id !== user.id;

      x = 50;
      doc.text(
        new Date(t.date).toLocaleDateString('ru-RU'),
        x, y, { width: columnWidths[0] }
      );
      x += columnWidths[0];

      doc.text(t.type === 'income' ? 'Доход' : 'Расход', x, y, { width: columnWidths[1] });
      x += columnWidths[1];

      doc.text(isHidden ? '🔒 Скрыто' : (t.category?.name || ''), x, y, { width: columnWidths[2] });
      x += columnWidths[2];

      doc.text(
        isHidden ? '—' : `${parseFloat(t.amount).toLocaleString('ru-RU')} ₽`,
        x, y, { width: columnWidths[3] }
      );

      y += rowHeight;
      visibleCount++;
    }

    if (transactions.length > maxRows) {
      doc.moveDown();
      doc.fontSize(8).text(`... и ещё ${transactions.length - maxRows} операций`, { align: 'center' });
    }

    doc.moveDown(2);
    doc.fontSize(8).text(`Всего операций: ${transactions.length}`, { align: 'center' });

    doc.end();
    logger.info(`User ${user.id} exported ${transactions.length} transactions as PDF`);
  } catch (error) {
    next(error);
  }
};
