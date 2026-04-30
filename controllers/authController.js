const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma-client');
const { sendPasswordResetEmail } = require('../services/emailService');
const { logger, ConflictError, UnauthorizedError } = require('../lib/errors');

const REFRESH_TOKEN_EXPIRY_DAYS = 30;

function generateSecureInviteCode(length = 10) {
  return crypto.randomBytes(Math.ceil(length)).toString('base64url').slice(0, length).toUpperCase();
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  
  await prisma.refreshToken.create({
    data: {
      user_id: userId,
      token,
      expires_at: expiresAt,
    },
  });
  
  return { token, expiresAt };
}

async function revokeRefreshToken(token) {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { revoked: true },
  });
}

async function revokeAllUserTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { user_id: userId, revoked: false },
    data: { revoked: true },
  });
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
    const refreshTokenData = await generateRefreshToken(user.id);

    logger.info({ userId: user.id, action: 'register' }, 'User registered');

    const cookieOptions = { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    };
    res.cookie('token', token, cookieOptions);
    res.cookie('refreshToken', refreshTokenData.token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      token,
      refreshToken: refreshTokenData.token,
      refreshTokenExpiresAt: refreshTokenData.expiresAt,
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
    const refreshTokenData = await generateRefreshToken(user.id);

    logger.info({ userId: user.id, action: 'login' }, 'User logged in');

    const cookieOptions = { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    };
    res.cookie('token', token, cookieOptions);
    res.cookie('refreshToken', refreshTokenData.token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      family_id: user.family_id,
      token,
      refreshToken: refreshTokenData.token,
      refreshTokenExpiresAt: refreshTokenData.expiresAt,
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

    await prisma.familyMember.create({
      data: {
        user_id: user.id,
        family_id: family.id,
        role: 'OWNER',
      }
    });

    res.status(201).json({
      id: family.id,
      name: family.name,
      invite_code: family.invite_code,
    });
  } catch (error) {
    next(error);
  }
};

exports.joinFamily = async (req, res, next) => {
  try {
    const inviteCode = String(req.body.inviteCode || req.body.code || '').trim().toUpperCase();
    
    if (!inviteCode) {
      return res.status(400).json({ message: 'Укажите код приглашения' });
    }
    
    if (req.user.family_id) {
      return res.status(400).json({ message: 'Вы уже состоите в семье' });
    }

    // Используем транзакцию для атомарности
    const result = await prisma.$transaction(async (tx) => {
      // Ищем активный инвайт по коду с блокировкой
      const invite = await tx.familyInvite.findFirst({
        where: {
          code: inviteCode,
          status: 'active',
          OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }],
        }
      });
      
      if (!invite) {
        throw new Error('INVITE_NOT_FOUND');
      }

      const family = await tx.family.findUnique({ where: { id: invite.family_id } });
      if (!family) {
        throw new Error('FAMILY_NOT_FOUND');
      }

      // Обновляем пользователя
      await tx.user.update({
        where: { id: req.user.id },
        data: { family_id: family.id }
      });
      
      // Создаём запись участника
      await tx.familyMember.create({
        data: {
          user_id: req.user.id,
          family_id: family.id,
          role: 'MEMBER',
        }
      });
      
      // Помечаем инвайт как использованный
      await tx.familyInvite.update({
        where: { id: invite.id },
        data: {
          status: 'used',
          used_by: req.user.id,
          used_at: new Date(),
        }
      });

      return { family_id: family.id };
    });

    res.json({ message: 'Вы присоединились к семье', family_id: result.family_id });
  } catch (error) {
    if (error.message === 'INVITE_NOT_FOUND') {
      return res.status(404).json({ message: 'Код не найден или уже использован' });
    }
    if (error.message === 'FAMILY_NOT_FOUND') {
      return res.status(404).json({ message: 'Семья не найдена' });
    }
    next(error);
  }
};

exports.createFamilyInvite = async (req, res, next) => {
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
            status: 'active',
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
    next(error);
  }
};

exports.listFamilyInvites = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user.family_id) return res.status(400).json({ message: 'Вы не состоите в семье' });

    const invites = await prisma.familyInvite.findMany({
      where: {
        family_id: user.family_id,
        OR: [
          { status: 'active', OR: [{ expires_at: null }, { expires_at: { gt: new Date() } }] },
          { status: 'used' },
          { status: 'revoked' }
        ],
      },
      orderBy: { created_at: 'desc' },
      select: { 
        id: true, code: true, created_by: true, expires_at: true, created_at: true,
        status: true, used_by: true, used_at: true,
        usedByUser: { select: { id: true, name: true } }
      },
    });
    res.json(invites);
  } catch (error) {
    next(error);
  }
};

exports.revokeFamilyInvite = async (req, res, next) => {
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

    // Вместо удаления помечаем как отозванное
    await prisma.familyInvite.update({
      where: { id: invite.id },
      data: { status: 'revoked' }
    });
    res.json({ message: 'Приглашение отозвано' });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
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
    next(error);
  }
};

exports.leaveFamily = async (req, res, next) => {
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

    // При выходе из семьи:
    // - Личные транзакции (scope='personal'): family_id остаётся null
    // - Семейные транзакции (scope='family'/'shared'): НЕ меняем family_id (они остаются в семье)
    // - Личные Goals/Wishes (scope='personal'): остаются личными
    // - Семейные Goals/Wishes: остаются семейными

    // Для личных транзакций (scope='personal') - убеждаемся что family_id=null
    await prisma.transaction.updateMany({
      where: { user_id: user.id, scope: 'personal' },
      data: { family_id: null }
    });
    
    // Для личных бюджетов - убеждаемся что family_id=null  
    await prisma.budget.updateMany({ 
      where: { user_id: user.id, family_id: family.id }, 
      data: { family_id: null } 
    });
    
    // Goals и Wishes остаются как есть - личные остаются личными, семейные остаются семейными
    // Пользователь сохраняет доступ к своим личным Goals/Wishes
    
    await prisma.user.update({ where: { id: user.id }, data: { family_id: null } });
    res.json({ message: 'Вы покинули семью' });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
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
    next(error);
  }
};

exports.removeFamilyMember = async (req, res, next) => {
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

    // Аналогично leaveFamily - не меняем семейные транзакции
    await prisma.transaction.updateMany({
      where: { user_id: member.id, scope: 'personal' },
      data: { family_id: null }
    });
    await prisma.budget.updateMany({ 
      where: { user_id: member.id, family_id: family.id }, 
      data: { family_id: null } 
    });
    // Goals/Wishes остаются без изменений
    await prisma.user.update({ where: { id: member.id }, data: { family_id: null } });
    res.json({ message: `Участник ${member.name} удалён из семьи` });
  } catch (error) {
    next(error);
  }
};

exports.transferOwnership = async (req, res, next) => {
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
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Укажите email' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'Если email существует, код для сброса отправлен' });

    await prisma.passwordResetToken.deleteMany({ where: { user_id: user.id } });

    const code = crypto.randomInt(100000, 999999).toString();
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
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
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
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    let refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (storedToken.revoked) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedError('Refresh token has expired');
    }

    const user = await prisma.user.findUnique({
      where: { id: storedToken.user_id },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    await revokeRefreshToken(refreshToken);

    const newToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '7d' });
    const newRefreshTokenData = await generateRefreshToken(user.id);

    logger.info({ userId: user.id, action: 'refresh_token' }, 'Token refreshed');

    const cookieOptions = { 
      httpOnly: true, 
      maxAge: 7 * 24 * 60 * 60 * 1000, 
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', 
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    };
    res.cookie('token', newToken, cookieOptions);
    res.cookie('refreshToken', newRefreshTokenData.token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
    res.json({ message: 'Token refreshed' });
  } catch (error) {
    next(error);
  }
};

exports.revokeToken = async (req, res, next) => {
  try {
    let refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token required' });
    }

    await revokeRefreshToken(refreshToken);
    logger.info({ action: 'revoke_token' }, 'Refresh token revoked');

    res.json({ message: 'Token revoked successfully' });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    
    logger.info({ userId: req.user?.id, action: 'logout' }, 'User logged out');
    res.clearCookie('token', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};