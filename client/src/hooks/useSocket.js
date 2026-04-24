import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socket = null;

export const useSocket = () => {
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    // Connect Socket.io
    if (!socket) {
      socket = io(window.location.origin, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('user:join', { userId: user._id, role: user.role });
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    return () => {
      // Don't disconnect on component unmount — keep socket alive
    };
  }, [user]);

  return socketRef.current;
};

export const getSocket = () => socket;

export default useSocket;
