const express = require('express');
const { Category } = require('../models');
const authMiddleware = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

router.use(authMiddleware);

// Получить все доступные категории (системные + семейные + личные)
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { family_id: null, user_id: null, is_system: true }, // системные
          { family_id: familyId }, // семейные
          { user_id: user.id } // личные
        ]
      },
      order: [['type', 'ASC'], ['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Создать категорию
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const { name, type } = req.body;
    if (!name || !type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Некорректные данные' });
    }
    const category = await Category.create({
      name,
      type,
      family_id: user.family_id,
      user_id: user.id,
      is_system: false,
    });
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Удалить категорию
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const category = await Category.findOne({
      where: {
        id,
        user_id: user.id,
        is_system: false,
      },
    });
    if (!category) {
      return res.status(404).json({ message: 'Категория не найдена или недоступна для удаления' });
    }
    await category.destroy();
    res.json({ message: 'Категория удалена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

module.exports = router;