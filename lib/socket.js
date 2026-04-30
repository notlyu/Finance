const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { logger } = require('./errors');

let io = null;

const userSockets = new Map();

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || '*',
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket connected');

    userSockets.set(socket.userId, socket.id);

    socket.on('disconnect', () => {
      logger.info({ userId: socket.userId, socketId: socket.id }, 'WebSocket disconnected');
      userSockets.delete(socket.userId);
    });

    socket.on('error', (err) => {
      logger.error({ userId: socket.userId, error: err.message }, 'WebSocket error');
    });
  });

  return io;
}

function emitToUser(userId, event, data) {
  if (!io) return false;
  
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}

function emitToFamily(familyId, event, data, excludeUserId = null) {
  if (!io) return false;

  userSockets.forEach((socketId, userId) => {
    if (userId !== excludeUserId) {
      io.to(socketId).emit(event, data);
    }
  });
  return true;
}

function emitNotification(userId, notification) {
  return emitToUser(userId, 'notification', notification);
}

function emitFamilyUpdate(familyId, event, data, excludeUserId = null) {
  if (!io) return false;

  const sockets = io.sockets.sockets;
  sockets.forEach((socket) => {
    if (socket.userId && socket.userId !== excludeUserId) {
      socket.emit(event, data);
    }
  });
  return true;
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
