const prisma = require('../lib/prisma-client');
const ExcelJS = require('exceljs');
const { logger, ForbiddenError } = require('../lib/errors');

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

    const header = ['date','type','amount','category','user','comment'];
    const rows = transactions.map(t => [t.date, t.type, t.amount, t.category?.name ?? '', t.user?.name ?? '', t.comment ?? '']);
    const csv = [header.join(','), ...rows.map(r => r.map(v => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(','))].join('\n');

    logger.info(`User ${user.id} exported ${transactions.length} transactions as CSV`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
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

    transactions.forEach(t => {
      const isHidden = t.is_private && t.user_id !== user.id;
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