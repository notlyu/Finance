const { RecurringTransaction, Category } = require('../lib/models');

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

exports.getRecurring = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const where = familyId
      ? { OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
      : { user_id: user.id, family_id: null };

    const items = await RecurringTransaction.findAll({
      where,
      order: [['active', 'DESC'], ['type', 'ASC'], ['id', 'DESC']],
    });

    // Get category names separately
    const categoryIds = [...new Set(items.map(i => i.category_id))];
    let categoryMap = {};
    if (categoryIds.length > 0) {
      try {
        const { prisma } = require('../lib/models');
        const categories = await prisma.category.findMany({
          where: { id: { in: categoryIds } },
        });
        categoryMap = Object.fromEntries(categories.map(c => [c.id, c.name]));
      } catch (catErr) {
        console.error('Error fetching categories:', catErr.message);
      }
    }

    res.json(items.map(i => ({
      id: i.id,
      type: i.type,
      amount: i.amount,
      category_id: i.category_id,
      category_name: categoryMap[i.category_id] || '',
      day_of_month: i.day_of_month,
      start_month: i.start_month,
      comment: i.comment,
      is_private: !!i.is_private,
      active: !!i.active,
      last_run_month: i.last_run_month,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.createRecurring = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    const {
      type,
      amount,
      category_id,
      day_of_month = 1,
      start_month = currentMonth(),
      comment,
      is_private = false,
    } = req.body;

    if (!['income', 'expense'].includes(type)) return res.status(400).json({ message: 'Некорректный type' });
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return res.status(400).json({ message: 'amount должен быть > 0' });
    const day = Number(day_of_month);
    if (!Number.isFinite(day) || day < 1 || day > 28) return res.status(400).json({ message: 'day_of_month должен быть 1..28' });
    if (!/^\d{4}-\d{2}$/.test(String(start_month))) return res.status(400).json({ message: 'start_month должен быть YYYY-MM' });
    if (!category_id) return res.status(400).json({ message: 'category_id обязателен' });

    const item = await RecurringTransaction.create({
      family_id: familyId || null,
      user_id: user.id,
      category_id,
      amount: a,
      type,
      day_of_month: day,
      start_month,
      comment: comment || null,
      is_private: !!is_private,
    });

    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.updateRecurring = async (req, res) => {
   try {
     const user = req.user;
     const familyId = user.family_id;

     const { id } = req.params;
     const item = await RecurringTransaction.findOne({
       where: familyId
         ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
         : { id, user_id: user.id, family_id: null },
     });
     if (!item) return res.status(404).json({ message: 'Не найдено' });

     if (item.user_id !== user.id) return res.status(403).json({ message: 'Нет прав' });

     const patch = {};
     if (req.body.amount != null) {
       const a = Number(req.body.amount);
       if (!Number.isFinite(a) || a <= 0) return res.status(400).json({ message: 'amount должен быть > 0' });
       patch.amount = a;
     }
     if (req.body.day_of_month != null) {
       const day = Number(req.body.day_of_month);
       if (!Number.isFinite(day) || day < 1 || day > 28) return res.status(400).json({ message: 'day_of_month должен быть 1..28' });
       patch.day_of_month = day;
     }
     if (req.body.category_id != null) patch.category_id = req.body.category_id;
     if (req.body.comment != null) patch.comment = req.body.comment || null;
     if (req.body.is_private != null) patch.is_private = !!req.body.is_private;
     if (req.body.active != null) patch.active = !!req.body.active;
     patch.updated_at = new Date();

     await item.update(patch);
     res.json(item);
   } catch (error) {
     console.error(error);
     res.status(500).json({ message: 'Ошибка сервера' });
   }
 };

exports.deleteRecurring = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

     const { id } = req.params;
     const item = await RecurringTransaction.findOne({
       where: familyId
         ? { id, OR: [{ family_id: familyId }, { family_id: null, user_id: user.id }] }
         : { id, user_id: user.id, family_id: null },
     });
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    if (item.user_id !== user.id) return res.status(403).json({ message: 'Нет прав' });

    await item.destroy();
    res.json({ message: 'Удалено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

