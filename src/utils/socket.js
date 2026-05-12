import { io } from 'socket.io-client';
import { getToken } from './storage';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

export const SOCKET_EVENTS = {
  REQUEST_CREATED: 'request:created',
  REQUEST_UPDATED: 'request:updated',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  EVENT_CREATED: 'event:created',
  EVENT_UPDATED: 'event:updated',
  EVENT_DELETED: 'event:deleted',
};

let socket;

export const getSocket = () => {
  const token = getToken();

  if (!token) {
    return null;
  }

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: {
        token,
      },
    });
  }

  socket.auth = { token };

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
