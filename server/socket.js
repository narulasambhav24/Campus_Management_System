const { Server } = require('socket.io');
const User = require('./models/User');
const { verifyToken } = require('./utils/jwt');

const SOCKET_EVENTS = {
  REQUEST_CREATED: 'request:created',
  REQUEST_UPDATED: 'request:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  EVENT_CREATED: 'event:created',
  EVENT_UPDATED: 'event:updated',
  EVENT_DELETED: 'event:deleted',
};

const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '').trim();

      if (!token) {
        return next(new Error('Authentication token is required'));
      }

      const payload = verifyToken(token);
      const user = await User.findById(payload.userId);

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = {
        _id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
      };

      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.email}`);
    socket.join(`user-id:${socket.user._id}`);

    if (socket.user.role === 'student') {
      socket.join('students');
    }

    if (socket.user.role === 'admin') {
      socket.join('admins');
    }

    socket.emit('socket:ready', {
      user: socket.user,
    });
  });

  return io;
};

module.exports = {
  SOCKET_EVENTS,
  createSocketServer,
};
