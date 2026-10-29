import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { disableBrowserPush } from '../services/browserPush';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
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

  useEffect(() => {
    const expired = () => { disableBrowserPush(true).catch(() => {}); setToken(null); setUser(null); setSessionError(''); };
    const refreshed = (event) => setToken(event.detail);
    window.addEventListener('auth-session-expired', expired);
    window.addEventListener('auth-token-refreshed', refreshed);
    return () => {
      window.removeEventListener('auth-session-expired', expired);
      window.removeEventListener('auth-token-refreshed', refreshed);
    };
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMe = async () => {
    setLoading(true);
    setSessionError('');
    try {
      const { data } = await api.get('/auth/me');
      if (data.success) setUser(data.user);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('refreshToken');
      } else {
        setSessionError('Unable to reach the academy. Check your connection and retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const synchronize = (event) => {
      if (event.key !== 'token' && event.key !== null) return;
      setUser(null); setSessionError(''); setToken(event.newValue);
      if (event.newValue) fetchMe(); else setLoading(false);
    };
    window.addEventListener('storage', synchronize);
    return () => window.removeEventListener('storage', synchronize);
  }, []);

  const login = async (role, identifier, password) => {
    const { data } = await api.post(role ? `/auth/login/${role}` : '/auth/login', { identifier, password });
    if (data.success) {
      if (localStorage.getItem('browser-push-user') && localStorage.getItem('browser-push-user') !== data.user._id) await disableBrowserPush(true).catch(() => {});
      setSessionError('');
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
      await disableBrowserPush().catch(() => {});
      await api.post('/auth/logout');
    } catch {
      // Silent fail
    } finally {
      setToken(null);
      setUser(null);
      setSessionError('');
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
        sessionError,
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
