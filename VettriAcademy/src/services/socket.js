import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';
import { logDev, warnDev } from '../utils/logger';

// ─── Socket.io Service ─────────────────────────────────────────────────────────
// Modular design to allow FCM integration later without refactoring.

let socket = null;
const eventHandlers = new Map(); // eventName → Set<handler>

/**
 * Connect to Socket.io server
 */
export const connectSocket = (userId, role) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    logDev('Socket connected');
    // Identify user and join personal room
    socket.emit('user:join', { userId, role });
  });

  socket.on('disconnect', (reason) => {
    logDev('Socket disconnected');
  });

  socket.on('connect_error', (error) => {
    warnDev('Socket connection error:', error.message);
  });

  socket.on('reconnect', (attempt) => {
    logDev('Socket reconnected');
    // Re-identify on reconnect
    socket.emit('user:join', { userId, role });
  });

  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    eventHandlers.clear();
  }
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

/**
 * Join a specific room
 */
export const joinRoom = (room) => {
  if (socket?.connected) {
    socket.emit('join:room', { room });
  }
};

/**
 * Leave a specific room
 */
export const leaveRoom = (room) => {
  if (socket?.connected) {
    socket.emit('leave:room', { room });
  }
};

/**
 * Join admin monitor room
 */
export const joinAdminMonitor = () => {
  if (socket?.connected) {
    socket.emit('admin:join-monitor');
  }
};

// ─── Chat Events ────────────────────────────────────────────────────────────────

/**
 * Send a chat message via socket
 */
export const sendChatMessage = (senderId, receiverId, message) => {
  if (socket?.connected) {
    socket.emit('chat:send', { senderId, receiverId, message });
  }
};

/**
 * Join a chat room
 */
export const joinChatRoom = (userId1, userId2) => {
  if (socket?.connected) {
    socket.emit('chat:join', { userId1, userId2 });
  }
};

/**
 * Send typing indicator
 */
export const sendTypingIndicator = (conversationId, isTyping, targetUserId) => {
  if (socket?.connected) {
    socket.emit('chat:typing', { conversationId, isTyping, targetUserId });
  }
};

/**
 * Mark notification as read via socket
 */
export const markNotificationReadSocket = (notificationId) => {
  if (socket?.connected) {
    socket.emit('notification:read', { notificationId });
  }
};

// ─── Event Listener Management ─────────────────────────────────────────────────
// These provide a clean API that can later be swapped to FCM handlers

/**
 * Subscribe to a socket event
 * Returns an unsubscribe function
 */
export const onSocketEvent = (eventName, handler) => {
  if (!socket) return () => {};

  socket.on(eventName, handler);

  // Track for cleanup
  if (!eventHandlers.has(eventName)) {
    eventHandlers.set(eventName, new Set());
  }
  eventHandlers.get(eventName).add(handler);

  // Return unsubscribe function
  return () => {
    socket?.off(eventName, handler);
    eventHandlers.get(eventName)?.delete(handler);
  };
};

/**
 * Remove all handlers for an event
 */
export const removeAllHandlers = (eventName) => {
  if (socket && eventHandlers.has(eventName)) {
    eventHandlers.get(eventName).forEach((handler) => {
      socket.off(eventName, handler);
    });
    eventHandlers.delete(eventName);
  }
};

// ─── Notification Abstraction Layer ─────────────────────────────────────────────
// This layer abstracts notification delivery so FCM can be plugged in later.

const notificationListeners = new Set();

/**
 * Register a notification listener (works with Socket.io now, FCM later)
 * Returns unsubscribe function
 */
export const onNotification = (callback) => {
  notificationListeners.add(callback);

  // Subscribe to socket notification event
  const unsubSocket = onSocketEvent('notification:new', (data) => {
    callback({
      source: 'socket',
      ...data,
    });
  });

  return () => {
    notificationListeners.delete(callback);
    unsubSocket();
  };
};

/**
 * Future: Call this to initialize FCM when ready
 * export const initializeFCM = async () => {
 *   // Request permission
 *   // Get FCM token
 *   // Register background handler
 *   // Forward incoming FCM messages to notificationListeners
 * };
 */
