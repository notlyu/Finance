const express = require('express');
const prisma = require('../lib/prisma-client');
const authMiddleware = require('../middleware/auth');
const { validateMiddleware, validateObjectId } = require('../lib/validation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;

    let categories;
    if (familyId) {
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { is_system: true },
            { family_id: familyId }
          ]
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
      });
    } else {
      categories = await prisma.category.findMany({
        where: {
          OR: [
            { is_system: true },
            { user_id: user.id, family_id: null }
          ]
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }]
      });
    }

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
    const { name, type, scope: reqScope } = req.body;
    const scope = reqScope || (user.family_id ? 'family' : 'personal');
    const category = await prisma.category.create({
      data: {
        name,
        type,
        family_id: scope !== 'personal' ? user.family_id : null,
        user_id: user.id,
        is_system: false,
        scope,
      }
    });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

router.delete('/:id', validateObjectId, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    // Allow deletion if: user owns the category OR user is family owner with family category
    const category = await prisma.category.findFirst({
      where: {
        id: Number(id),
        is_system: false,
        OR: [
          { user_id: user.id },
          { family_id: user.family_id, family_id: { not: null } }
        ]
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