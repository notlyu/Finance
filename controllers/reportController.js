const { Transaction, Category, User } = require('../models');
const { Op, fn, col } = require('sequelize');
const ExcelJS = require('exceljs');

function toMonthKeyFromDateOnly(dateOnly) {
  // Transaction.date is DATEONLY and may come as string 'YYYY-MM-DD' (or Date depending on dialect/options).
  const d = dateOnly instanceof Date ? dateOnly : new Date(`${dateOnly}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

// Динамика доходов и расходов по месяцам
exports.getDynamics = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    // Default: last 12 months (to align with analytics expectations)
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let start, end;
    if (!req.query.startDate && !req.query.endDate) {
      const s = new Date(today.getFullYear(), today.getMonth() - 11, 1);
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      start = s.toISOString().slice(0, 10);
      end = e.toISOString().slice(0, 10);
      // For UI hints, provide current day as highlighted date
    } else {
      start = req.query.startDate ? String(req.query.startDate) : new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      end = req.query.endDate ? String(req.query.endDate) : todayStr;
    }
    const defaultRange = { start: start, end: end, today: todayStr };
    // Use end as exclusive boundary by adding one day
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const txWhere = {
      date: { [Op.gte]: start, [Op.lt]: endExclusive.toISOString().slice(0, 10) },
    };
    if (memberId) {
      txWhere[Op.or] = familyId
        ? [
            { family_id: familyId, user_id: memberId, [Op.or]: [{ is_private: false }, { user_id: memberId }] },
            { family_id: null, user_id: memberId },
          ]
        : { family_id: null, user_id: memberId };
    } else {
      txWhere[Op.or] = familyId
        ? [
            { family_id: familyId, [Op.or]: [{ is_private: false }, { user_id: user.id }] },
            { family_id: null, user_id: user.id },
          ]
        : { family_id: null, user_id: user.id };
    }
    const rows = await Transaction.findAll({
      where: txWhere,
      attributes: [
        [fn('DATE_FORMAT', col('date'), '%Y-%m'), 'month'],
        'type',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['month', 'type'],
      order: [[col('month'), 'ASC']],
      raw: true,
    });

    const months = [];
    const incomeByMonth = {};
    const expenseByMonth = {};

    // Build month list inclusively from start to end month
    const startD = new Date(`${start}T00:00:00`);
    const endD = new Date(`${end}T00:00:00`);
    const cursor = new Date(startD.getFullYear(), startD.getMonth(), 1);
    // include the end month by moving endCursor to the first day of the next month
    const endCursor = new Date(endD.getFullYear(), endD.getMonth() + 1, 1);
    while (cursor < endCursor) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      months.push(key);
      incomeByMonth[key] = 0;
      expenseByMonth[key] = 0;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    rows.forEach(r => {
      const key = r.month;
      if (!incomeByMonth.hasOwnProperty(key)) return;
      const val = parseFloat(r.total || 0);
      if (r.type === 'income') incomeByMonth[key] += val;
      else expenseByMonth[key] += val;
    });

    // Extend response with a defaultRange hint for UI date pickers
    // Also provide today's date hint for quick-pick in UI
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
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Расходы по категориям
exports.getExpensesByCategory = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { startDate, endDate } = req.query;
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const dateFilter = {};
    if (startDate && endDate) dateFilter[Op.between] = [startDate, endDate];
    else if (startDate) dateFilter[Op.gte] = startDate;
    else if (endDate) dateFilter[Op.lte] = endDate;

    const where = { type: 'expense', ...dateFilter };
    if (memberId) {
      where[Op.or] = familyId
        ? [
            { family_id: familyId, user_id: memberId, [Op.or]: [{ is_private: false }, { user_id: memberId }] },
            { family_id: null, user_id: memberId },
          ]
        : { family_id: null, user_id: memberId };
    } else {
      where[Op.or] = familyId
        ? [
            { family_id: familyId, [Op.or]: [{ is_private: false }, { user_id: user.id }] },
            { family_id: null, user_id: user.id },
          ]
        : { family_id: null, user_id: user.id };
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['name'] }],
      attributes: ['amount', 'category_id'],
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.Category ? t.Category.name : 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Доходы по категориям (аналогично)
exports.getIncomeByCategory = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const { startDate, endDate } = req.query;
    const memberId = req.query.memberId ? Number(req.query.memberId) : null;
    const dateFilter = {};
    if (startDate && endDate) dateFilter[Op.between] = [startDate, endDate];
    else if (startDate) dateFilter[Op.gte] = startDate;
    else if (endDate) dateFilter[Op.lte] = endDate;

    const where = { type: 'income', ...dateFilter };
    if (memberId) {
      where[Op.or] = familyId
        ? [
            { family_id: familyId, user_id: memberId, [Op.or]: [{ is_private: false }, { user_id: memberId }] },
            { family_id: null, user_id: memberId },
          ]
        : { family_id: null, user_id: memberId };
    } else {
      where[Op.or] = familyId
        ? [
            { family_id: familyId, [Op.or]: [{ is_private: false }, { user_id: user.id }] },
            { family_id: null, user_id: user.id },
          ]
        : { family_id: null, user_id: user.id };
    }

    const transactions = await Transaction.findAll({
      where,
      include: [{ model: Category, as: 'Category', attributes: ['name'] }],
      attributes: ['amount', 'category_id'],
    });

    const categoryTotals = {};
    transactions.forEach(t => {
      const catName = t.Category ? t.Category.name : 'Без категории';
      categoryTotals[catName] = (categoryTotals[catName] || 0) + parseFloat(t.amount);
    });

    const data = Object.entries(categoryTotals).map(([name, total]) => ({ name, total }));
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт отчёта (CSV)
exports.exportReport = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) dateFilter[Op.between] = [startDate, endDate];
    else if (startDate) dateFilter[Op.gte] = startDate;
    else if (endDate) dateFilter[Op.lte] = endDate;

    const where = familyId
      ? { [Op.or]: [{ family_id: familyId, [Op.or]: [{ is_private: false }, { user_id: user.id }] }, { family_id: null, user_id: user.id }], ...dateFilter }
      : { family_id: null, user_id: user.id, ...dateFilter };

    const transactions = await Transaction.findAll({ where, include: [
      { model: Category, as: 'Category', attributes: ['name'] },
      { model: User, as: 'User', attributes: ['name'] }
    ], order: [['date','DESC']] });

    // Build CSV header and rows
    const header = ['date','type','amount','category','user','comment'];
    const rows = transactions.map(t => [t.date, t.type, t.amount, t.Category?.name ?? '', t.User?.name ?? '', t.comment ?? '']);
    const csv = [header.join(','), ...rows.map(r => r.map(v => {
      if (v == null) return '';
      const s = String(v);
      if (s.includes(',') || s.includes('\n') || s.includes('"')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Экспорт отчёта в Excel (.xlsx)
exports.exportExcel = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate && endDate) dateFilter[Op.between] = [startDate, endDate];
    else if (startDate) dateFilter[Op.gte] = startDate;
    else if (endDate) dateFilter[Op.lte] = endDate;

    const where = familyId
      ? { [Op.or]: [{ family_id: familyId, [Op.or]: [{ is_private: false }, { user_id: user.id }] }, { family_id: null, user_id: user.id }], ...dateFilter }
      : { family_id: null, user_id: user.id, ...dateFilter };

    const transactions = await Transaction.findAll({ where, include: [
      { model: Category, as: 'Category', attributes: ['name'] },
      { model: User, as: 'User', attributes: ['name'] }
    ], order: [['date','DESC']] });

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

    // Style header
    sheet.getRow(1).font = { bold: true, size: 11 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

    transactions.forEach(t => {
      const isHidden = t.is_private && t.user_id !== user.id;
      sheet.addRow({
        date: t.date,
        type: t.type === 'income' ? 'Доход' : 'Расход',
        category: isHidden ? '🔒 Сюрприз' : (t.Category?.name || ''),
        amount: isHidden ? 0 : Number(t.amount),
        user: t.User?.name || '',
        comment: isHidden ? '' : (t.comment || ''),
      });
    });

    // Format amount column
    sheet.getColumn('amount').numFmt = '#,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.xlsx"');
    res.send(buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};
