import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (user) {
      // Connect socket
      const s = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });

      socketRef.current = s;
      setSocket(s);

      s.on('connect', () => {
        console.log('🔌 Socket connected:', s.id);

        // Identify user
        s.emit('user:join', { userId: user._id, role: user.role });

        // Join role-specific rooms
        if (user.role === 'admin') {
          s.emit('join:room', { room: 'admin_room' });
          s.emit('admin:join-monitor');
        } else if (user.role === 'teacher') {
          s.emit('join:room', { room: `teacher_${user._id}` });
        } else if (user.role === 'student') {
          // Join course+grade room for class notifications
          if (user.course && user.grade) {
            const courseStr = user.course?.title || user.course?._id || user.course;
            s.emit('join:room', { room: `course_${courseStr}_${user.grade}` });
          }
        }
      });

      s.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      return () => {
        s.disconnect();
        setSocket(null);
      };
    }
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};

export default SocketContext;
