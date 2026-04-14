const express = require('express');
const prisma = require('../lib/prisma-client');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    let categories = await prisma.category.findMany({
      where: familyId
        ? {
            OR: [
              { family_id: null, user_id: null, is_system: true },
              { family_id: familyId },
              { user_id: user.id }
            ]
          }
        : {
            OR: [
              { family_id: null, user_id: null, is_system: true },
              { user_id: user.id }
            ]
          },
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    });

    const seen = new Set();
    const uniqueCategories = [];
    for (const c of categories) {
      const key = `${c.name}|${c.type}|${c.family_id ?? 'NULL'}|${c.user_id ?? 'NULL'}|${c.is_system ? 'SYS' : 'USR'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueCategories.push(c);
      }
    }

    res.json(uniqueCategories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.post('/', validateMiddleware('category', 'create'), async (req, res) => {
  try {
    const user = req.user;
    const { name, type } = req.body;
    if (!name || !type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Некорректные данные' });
    }
    const category = await prisma.category.create({
      data: {
        name,
        type,
        family_id: user.family_id,
        user_id: user.id,
        is_system: false,
      }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const category = await prisma.category.findFirst({
      where: {
        id: Number(id),
        user_id: user.id,
        is_system: false,
      },
    });
    if (!category) {
      return res.status(404).json({ message: 'Категория не найдена или недоступна для удаления' });
    }
    await prisma.category.delete({ where: { id: category.id } });
    res.json({ message: 'Категория удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;