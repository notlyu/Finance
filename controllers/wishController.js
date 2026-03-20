const { Wish, WishContribution, User, Family } = require('../models');
const { Op } = require('sequelize');

// Получить все желания пользователя (личные + семейные)
exports.getWishes = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const where = {
      family_id: familyId,
      [Op.or]: [
        { user_id: user.id },                // личные желания пользователя
        { is_private: false }                // не скрытые желания других членов
      ]
    };

    const wishes = await Wish.findAll({
      where,
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] }
      ],
      order: [['priority', 'ASC'], ['created_at', 'DESC']]
    });

    // Скрываем приватные желания других пользователей
    const result = wishes.map(wish => {
      const isOwner = wish.user_id === user.id;
      if (!isOwner && wish.is_private) {
        return {
          id: wish.id,
          is_private: true,
          is_hidden: true,
          user_name: wish.User.name,
          priority: wish.priority,
          status: wish.status,
          cost: wish.cost,
          saved_amount: wish.saved_amount,
          name: 'Скрытое желание'
        };
      }
      return wish;
    });

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получить одно желание
exports.getWishById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      },
      include: [
        { model: User, as: 'User', attributes: ['id', 'name'] },
        { model: WishContribution, as: 'Contributions', order: [['date', 'DESC']] }
      ]
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    const isOwner = wish.user_id === user.id;
    if (!isOwner && wish.is_private) {
      return res.json({
        id: wish.id,
        is_private: true,
        is_hidden: true,
        user_name: wish.User.name,
        priority: wish.priority,
        status: wish.status,
        cost: wish.cost,
        saved_amount: wish.saved_amount,
        name: 'Скрытое желание'
      });
    }

    res.json(wish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создать желание
exports.createWish = async (req, res) => {
  try {
    const user = req.user;
    const familyId = user.family_id;
    if (!familyId) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const { name, cost, priority, status, saved_amount, is_private } = req.body;

    if (!name || !cost) {
      return res.status(400).json({ message: 'Название и стоимость обязательны' });
    }

    const wish = await Wish.create({
      user_id: user.id,
      family_id: familyId,
      name,
      cost,
      priority: priority || 3,
      status: status || 'active',
      saved_amount: saved_amount || 0,
      is_private: is_private || false
    });

    res.status(201).json(wish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Обновить желание
exports.updateWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const updateData = req.body;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на редактирование' });
    }

    await wish.update(updateData);
    res.json(wish);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Удалить желание
exports.deleteWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    if (wish.user_id !== user.id && user.family?.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на удаление' });
    }

    await wish.destroy();
    res.json({ message: 'Желание удалено' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Пополнить желание
exports.contributeToWish = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { amount, date } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Сумма должна быть положительным числом' });
    }

    const wish = await Wish.findOne({
      where: {
        id,
        family_id: user.family_id
      }
    });

    if (!wish) {
      return res.status(404).json({ message: 'Желание не найдено' });
    }

    // Проверка прав: пополнять может только владелец желания
    if (wish.user_id !== user.id) {
      return res.status(403).json({ message: 'Нет прав на пополнение этого желания' });
    }

    const contribution = await WishContribution.create({
      wish_id: wish.id,
      amount,
      date: date || new Date(),
      transaction_id: null
    });

    const newSavedAmount = parseFloat(wish.saved_amount) + parseFloat(amount);
    await wish.update({ saved_amount: newSavedAmount });

    res.status(201).json({
      message: 'Желание пополнено',
      contribution,
      saved_amount: newSavedAmount
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};