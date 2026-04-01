const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { User, Family, FamilyInvite } = require('../models');

function generateSecureInviteCode(length = 10) {
  // url-safe base64, trimmed and uppercased for readability
  return crypto.randomBytes(Math.ceil(length)).toString('base64url').slice(0, length).toUpperCase();
}

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

    const inviteCode = generateSecureInviteCode(10);

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
    const inviteCode = String(req.body.inviteCode || req.body.code || '').trim().toUpperCase();
    const user = req.user;

    if (user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    if (!inviteCode) return res.status(400).json({ message: 'Укажите код приглашения' });

    // 1) Prefer new flow: family_invites
    const invite = await FamilyInvite.findOne({
      where: {
        code: inviteCode,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
    });

    let family = null;
    if (invite) {
      family = await Family.findByPk(invite.family_id);
    } else {
      // 2) Backward compatibility: families.invite_code
      family = await Family.findOne({ where: { invite_code: inviteCode } });
    }
    if (!family) return res.status(404).json({ message: 'Код не найден или истёк' });

    await user.update({ family_id: family.id });

    res.json({ message: 'Вы присоединились к семье', family_id: family.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

// Создать приглашение в семью (новый flow)
exports.createFamilyInvite = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const family = await Family.findByPk(user.family_id);
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });

    // Only owner can create invites (can be relaxed later)
    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может создавать приглашения' });
    }

    const days = Number(req.body.expiresInDays || 7);
    const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    // Retry a few times to avoid unique collisions
    let invite = null;
    for (let i = 0; i < 5; i++) {
      const code = generateSecureInviteCode(10);
      try {
        invite = await FamilyInvite.create({
          family_id: family.id,
          code,
          created_by: user.id,
          expires_at: expiresAt,
        });
        break;
      } catch (e) {
        if (e?.name !== 'SequelizeUniqueConstraintError') throw e;
      }
    }

    if (!invite) return res.status(500).json({ message: 'Не удалось создать приглашение, попробуйте ещё раз' });

    res.status(201).json({
      id: invite.id,
      code: invite.code,
      expires_at: invite.expires_at,
      created_at: invite.created_at,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.listFamilyInvites = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const invites = await FamilyInvite.findAll({
      where: {
        family_id: user.family_id,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'code', 'created_by', 'expires_at', 'created_at'],
    });
    res.json(invites);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.revokeFamilyInvite = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const family = await Family.findByPk(user.family_id);
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });
    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может отзывать приглашения' });
    }

    const { id } = req.params;
    const invite = await FamilyInvite.findOne({ where: { id, family_id: user.family_id } });
    if (!invite) return res.status(404).json({ message: 'Приглашение не найдено' });

    await invite.destroy();
    res.json({ message: 'Приглашение отозвано' });
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
        include: [{ model: User, as: 'Members', attributes: ['id', 'name', 'email'] }],
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
        members: family.Members, // ← также обратите внимание на регистр при обращении
      } : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.leaveFamily = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) {
      return res.status(400).json({ message: 'Вы не состоите в семье' });
    }

    const family = await Family.findByPk(user.family_id);
    if (family.owner_user_id === user.id && (await family.countMembers()) === 1) {
      // Если владелец и в семье только он, можно удалить семью или запретить выход
      await family.destroy();
      await user.update({ family_id: null });
      return res.json({ message: 'Семья удалена, вы вышли из неё' });
    }

    // Проверим, не единственный ли владелец
    if (family.owner_user_id === user.id) {
      return res.status(400).json({ message: 'Вы владелец семьи. Сначала передайте права другому участнику.' });
    }

    await user.update({ family_id: null });
    res.json({ message: 'Вы покинули семью' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = req.user;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Укажите старый и новый пароль' });
    }

    const valid = await bcrypt.compare(oldPassword, user.password_hash);
    if (!valid) {
      return res.status(401).json({ message: 'Неверный старый пароль' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ password_hash: hashed });
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};