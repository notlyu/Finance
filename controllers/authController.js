const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Family } = require('../models');

// Генерация случайного кода приглашения (6 символов)
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Регистрация
exports.register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Проверка, существует ли пользователь
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email уже зарегистрирован' });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя (пока без семьи)
    const user = await User.create({
      email,
      password_hash: hashedPassword,
      name,
      family_id: null,
    });

    // Создание JWT
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Вход
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создание семьи (только для авторизованных)
exports.createFamily = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    const inviteCode = generateInviteCode();

    const family = await Family.create({
      name,
      invite_code: inviteCode,
      owner_user_id: user.id,
    });

    // Обновляем пользователя: добавляем family_id
    await user.update({ family_id: family.id });

    res.status(201).json({
      id: family.id,
      name: family.name,
      invite_code: family.invite_code,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Присоединение к семье по коду
exports.joinFamily = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const user = req.user;

    if (user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    const family = await Family.findOne({ where: { invite_code: inviteCode } });
    if (!family) {
      return res.status(404).json({ message: 'Семья не найдена' });
    }

    await user.update({ family_id: family.id });

    res.json({ message: 'Вы присоединились к семье', family_id: family.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Получение информации о пользователе и семье
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    let family = null;
    if (user.family_id) {
      family = await Family.findByPk(user.family_id, {
        include: [{ model: User, as: 'members', attributes: ['id', 'name', 'email'] }],
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      family: family ? {
        id: family.id,
        name: family.name,
        invite_code: family.invite_code,
        members: family.members,
      } : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};