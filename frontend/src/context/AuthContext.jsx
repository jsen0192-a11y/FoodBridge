import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import apiClient, { SOCKET_URL } from '../services/api';

// Re-export API_URL for dashboard backward-compatibility
export { API_URL } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('foodbridge-token') || null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  
  const [verifyEmail, setVerifyEmail] = useState(null);

  const fetchMe = async () => {
    if (!token) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get('/auth/me');
      setUser(res.data.user);
      setProfile(res.data.profile);
      fetchNotifications();
    } catch (err) {
      console.error("Fetch profile failed, logging out:", err.message);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, [token]);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('⚡ Connected to socket channel');
      newSocket.emit('join', user.id || user._id);
    });

    newSocket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    newSocket.on('global_notification', (notif) => {
      if (notif.user === (user.id || user._id)) return;
      if (user.role === 'ngo' && notif.message.toLowerCase().includes('volunteer')) {
        setNotifications(prev => [notif, ...prev]);
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationsAsRead = async (notifId = 'all') => {
    if (!token) return;
    try {
      await apiClient.put(`/notifications/${notifId}/read`);
      if (notifId === 'all') {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } else {
        setNotifications(prev => prev.map(n => (n._id === notifId ? { ...n, isRead: true } : n)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/login', { email, password });
      
      const { token: accToken, refreshToken, user: userData } = res.data;
      localStorage.setItem('foodbridge-token', accToken);
      localStorage.setItem('foodbridge-refresh-token', refreshToken);
      setToken(accToken);
      return userData;
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        setVerifyEmail(email);
        throw new Error("verification_pending");
      }
      throw new Error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/register', userData);
      if (res.data.needsVerification) {
        setVerifyEmail(userData.email);
        return { needsVerification: true };
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/verify-otp', { email, otp });
      const { token: accToken, refreshToken, user: userData } = res.data;
      
      localStorage.setItem('foodbridge-token', accToken);
      localStorage.setItem('foodbridge-refresh-token', refreshToken);
      setToken(accToken);
      setVerifyEmail(null);
      return userData;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = async (googleProfile) => {
    setLoading(true);
    try {
      const res = await apiClient.post('/auth/google', googleProfile);
      
      if (res.status === 202) {
        return { needsRoleSelection: true, ...res.data };
      }

      const { token: accToken, refreshToken, user: userData } = res.data;
      localStorage.setItem('foodbridge-token', accToken);
      localStorage.setItem('foodbridge-refresh-token', refreshToken);
      setToken(accToken);
      return userData;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Google Auth failed');
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      return res.data.message;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to send reset link');
    }
  };

  const resetPassword = async (tokenVal, password) => {
    try {
      const res = await apiClient.post('/auth/reset-password', { token: tokenVal, password });
      return res.data.message;
    } catch (err) {
      throw new Error(err.response?.data?.message || 'Failed to reset password');
    }
  };

  const logout = () => {
    localStorage.removeItem('foodbridge-token');
    localStorage.removeItem('foodbridge-refresh-token');
    setToken(null);
    setUser(null);
    setProfile(null);
    setNotifications([]);
    setVerifyEmail(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      token,
      loading,
      notifications,
      socket,
      verifyEmail,
      setVerifyEmail,
      login,
      register,
      verifyOtp,
      googleSignIn,
      forgotPassword,
      resetPassword,
      logout,
      markNotificationsAsRead,
      fetchNotifications,
      getHeaders: () => ({ Authorization: `Bearer ${token}` })
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
