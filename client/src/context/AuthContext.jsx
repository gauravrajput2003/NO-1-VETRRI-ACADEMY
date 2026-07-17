import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // Set token in axios defaults
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, [token]);

  // Fetch current user on mount
  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) setUser(data.user);
    } catch {
      // Token invalid — clear it
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (role, identifier, password) => {
    const { data } = await api.post(`/auth/login/${role}`, { identifier, password });
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
      return data;
    }
    throw new Error(data.message);
  };

  const register = async (userData) => {
    const { data } = await api.post('/auth/register', { role: 'student', ...userData });
    if (data.success) {
      setToken(data.token);
      setUser(data.user);
      return data;
    }
    throw new Error(data.message);
  };

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Silent fail
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      toast.success('Logged out successfully');
    }
  }, []);

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateUser,
        fetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
