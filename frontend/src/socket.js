import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) return socket;

  const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  
  socket = io(socketUrl, {
    auth: {
      token,
    },
    autoConnect: false,
  });

  socket.connect();
  console.log('Socket client initialized');
  return socket;
};

export const getSocket = () => {
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('Socket client disconnected');
  }
};
