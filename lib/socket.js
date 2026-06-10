const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('./errors');
const prisma = require('./prisma-client');

let io = null;

const userSockets = new Map();
const userFamilyMap = new Map();

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket connected');

    const existing = userSockets.get(socket.userId) || new Set();
    existing.add(socket.id);
    userSockets.set(socket.userId, existing);

    try {
      const user = await prisma.user.findUnique({
        where: { id: socket.userId },
        select: { family_id: true },
      });
      if (user) {
        userFamilyMap.set(socket.userId, user.family_id);
      }
    } catch (err) {
      logger.error({ userId: socket.userId, error: err.message }, 'Failed to fetch user family');
    }

    socket.on('disconnect', () => {
      logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket disconnected');
      const sockets = userSockets.get(socket.userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(socket.userId);
          userFamilyMap.delete(socket.userId);
        }
      }
    });

    socket.on('error', (err) => {
      logger.error({ userId: socket.userId, error: err.message }, 'WebSocket error');
    });
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return false;
  
  const socketIds = userSockets.get(userId);
  if (socketIds && socketIds.size > 0) {
    socketIds.forEach(socketId => io.to(socketId).emit(event, data));
    return true;
  }
  return false;
}

function emitToFamily(familyId, event, data, excludeUserId = null) {
  if (!io) return false;

  let emitted = false;
  userSockets.forEach((socketIds, userId) => {
    if (userId !== excludeUserId && userFamilyMap.get(userId) === familyId) {
      socketIds.forEach(socketId => io.to(socketId).emit(event, data));
      emitted = true;
    }
  });
  return emitted;
}

function emitNotification(userId, notification) {
  return emitToUser(userId, 'notification', notification);
}

function emitFamilyUpdate(familyId, event, data, excludeUserId = null) {
  if (!io) return false;

  let emitted = false;
  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.userId && socket.userId !== excludeUserId && userFamilyMap.get(socket.userId) === familyId) {
      socket.emit(event, data);
      emitted = true;
    }
  });
  return emitted;
}

function getIO() {
  return io;
}

module.exports = {
  initSocket,
  emitToUser,
  emitToFamily,
  emitNotification,
  emitFamilyUpdate,
  getIO,
};
