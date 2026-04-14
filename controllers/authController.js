const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma-client');
const { sendPasswordResetEmail } = require('../services/emailService');
const { logger, ConflictError } = require('../lib/errors');

function generateSecureInviteCode(length = 10) {
  return crypto.randomBytes(Math.ceil(length)).toString('base64url').slice(0, length).toUpperCase();
}

exports.register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictError('Email уже зарегистрирован');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        name,
        family_id: null,
      },
    });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    logger.info({ userId: user.id, action: 'register' }, 'User registered');

    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });

    logger.info({ userId: user.id, action: 'login' }, 'User logged in');

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      token,
    });
  } catch (error) {
    next(error);
  }
};

exports.createFamily = async (req, res) => {
  try {
    const { name } = req.body;
    const user = req.user;

    if (user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    const inviteCode = generateSecureInviteCode(10);

    const family = await prisma.family.create({
      data: {
        name,
        invite_code: inviteCode,
        owner_user_id: user.id,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { family_id: family.id },
    });

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

exports.joinFamily = async (req, res) => {
  try {
    const inviteCode = String(req.body.inviteCode || req.body.code || '').trim().toUpperCase();
    
    if (!inviteCode) {
      return res.status(400).json({ message: 'Укажите код приглашения' });
    }
    
    if (req.user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    const family = await prisma.family.findFirst({
      where: { invite_code: inviteCode }
    });
    
    if (!family) {
      return res.status(404).json({ message: 'Код не найден' });
    }
    
    await prisma.user.update({
      where: { id: req.user.id },
      data: { family_id: family.id }
    });
    
    res.json({ message: 'Вы присоединились к семье', family_id: family.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.createFamilyInvite = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const family = await prisma.family.findUnique({ where: { id: user.family_id } });
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });

    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может создавать приглашения' });
    }

    const days = Number(req.body.expiresInDays || 7);
    const expiresAt = Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    let invite = null;
    for (let i = 0; i < 5; i++) {
      const code = generateSecureInviteCode(10);
      try {
        invite = await prisma.familyInvite.create({
          data: {
            family_id: family.id,
            code,
            created_by: user.id,
            expires_at: expiresAt,
          },
        });
        break;
      } catch (e) {
        if (e?.code !== 'P2002') throw e;
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

    const invites = await prisma.familyInvite.findMany({
      where: {
        family_id: user.family_id,
        OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
      },
      orderBy: { created_at: 'desc' },
      select: { id: true, code: true, created_by: true, expires_at: true, created_at: true },
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

    const family = await prisma.family.findUnique({ where: { id: user.family_id } });
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });
    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может отзывать приглашения' });
    }

    const { id } = req.params;
    const invite = await prisma.familyInvite.findFirst({ where: { id: Number(id), family_id: user.family_id } });
    if (!invite) return res.status(404).json({ message: 'Приглашение не найдено' });

    await prisma.familyInvite.delete({ where: { id: invite.id } });
    res.json({ message: 'Приглашение отозвано' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    let family = null;
    if (user.family_id) {
      family = await prisma.family.findUnique({
        where: { id: user.family_id },
        include: { members: { select: { id: true, name: true } } },
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
        owner_user_id: family.owner_user_id,
        members: family.members,
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

    const family = await prisma.family.findUnique({ where: { id: user.family_id } });
    const memberCount = await prisma.user.count({ where: { family_id: user.family_id } });
    
    if (family.owner_user_id === user.id && memberCount === 1) {
      await prisma.transaction.updateMany({ where: { user_id: user.id }, data: { family_id: null } });
      await prisma.budget.updateMany({ where: { user_id: user.id }, data: { family_id: null } });
      await prisma.family.delete({ where: { id: family.id } });
      await prisma.user.update({ where: { id: user.id }, data: { family_id: null } });
      return res.json({ message: 'Семья удалена, вы вышли из неё' });
    }

    if (family.owner_user_id === user.id) {
      return res.status(400).json({ message: 'Вы владелец семьи. Сначала передайте права другому участнику.' });
    }

    await prisma.transaction.updateMany({ where: { user_id: user.id }, data: { family_id: null } });
    await prisma.budget.updateMany({ where: { user_id: user.id }, data: { family_id: null } });
    await prisma.user.update({ where: { id: user.id }, data: { family_id: null } });
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
    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashed },
    });
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.removeFamilyMember = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const family = await prisma.family.findUnique({ where: { id: user.family_id } });
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });
    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может удалять участников' });
    }

    const { memberId } = req.params;
    const member = await prisma.user.findUnique({ where: { id: Number(memberId) } });
    if (!member || member.family_id !== family.id) {
      return res.status(404).json({ message: 'Участник не найден в этой семье' });
    }
    if (member.id === family.owner_user_id) {
      return res.status(400).json({ message: 'Нельзя удалить владельца семьи' });
    }

    await prisma.transaction.updateMany({ where: { user_id: member.id }, data: { family_id: null } });
    await prisma.budget.updateMany({ where: { user_id: member.id }, data: { family_id: null } });
    await prisma.user.update({ where: { id: member.id }, data: { family_id: null } });
    res.json({ message: `Участник ${member.name} удалён из семьи` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.transferOwnership = async (req, res) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const family = await prisma.family.findUnique({ where: { id: user.family_id } });
    if (!family) return res.status(404).json({ message: 'Семья не найдена' });
    if (family.owner_user_id !== user.id) {
      return res.status(403).json({ message: 'Только владелец семьи может передать владение' });
    }

    const { newOwnerId } = req.body;
    if (!newOwnerId || newOwnerId === user.id) {
      return res.status(400).json({ message: 'Укажите другого участника для передачи владения' });
    }

    const newOwner = await prisma.user.findUnique({ where: { id: newOwnerId } });
    if (!newOwner || newOwner.family_id !== family.id) {
      return res.status(404).json({ message: 'Участник не найден в этой семье' });
    }

    await prisma.family.update({
      where: { id: family.id },
      data: { owner_user_id: newOwnerId },
    });
    res.json({ message: `Владение передано участнику ${newOwner.name}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Укажите email' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'Если email существует, код для сброса отправлен' });

    await prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        user_id: user.id,
        token: code,
        expires_at: expiresAt,
      },
    });

    await sendPasswordResetEmail(email, code);
    res.json({ message: 'Если email существует, код для сброса отправлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    if (!code || !newPassword) return res.status(400).json({ message: 'Укажите код и новый пароль' });

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { token: code, expires_at: { gt: new Date() } },
    });
    if (!resetToken) return res.status(400).json({ message: 'Недействительный или истёкший код' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: resetToken.user_id },
      data: { password_hash: hashed },
    });
    await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });

    res.json({ message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
};