import { io } from 'socket.io-client';
import { getAccessToken } from './api';
import logger from '../utils/logger';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) return;

    const token = getAccessToken();
    if (!token) return;

    const wsUrl = process.env.REACT_APP_WS_URL || `http://localhost:${window.location.port === '3000' ? '3001' : window.location.port}`;

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      logger.info('WebSocket connected');
    });

    this.socket.on('disconnect', (reason) => {
      logger.info('WebSocket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      logger.error('WebSocket connection error:', error.message);
    });

    this.socket.on('notification', (notification) => {
      this.emit('notification', notification);
    });

    this.socket.on('family_update', (data) => {
      this.emit('family_update', data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();

export default socketService;
export { socketService };
