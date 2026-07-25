import React, { createContext, useState, useEffect, useContext } from 'react';
import { io } from 'socket.io-client';
import apiClient, { SOCKET_URL } from '../services/api';

// Re-export API_URL for dashboard backward-compatibility
export { API_URL } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Constant mock user profile (bypassing JWT auth)
  const [user, setUser] = useState({
    _id: 'anonymous',
    id: 'anonymous',
    name: 'Anonymous User',
    email: 'anonymous@foodbridge.org',
    role: 'admin'
  });
  const [profile, setProfile] = useState({
    name: 'Anonymous User'
  });
  const [token, setToken] = useState('dummy-token');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  // Initialize Socket.io Connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('⚡ Connected to socket channel (Bypass mode)');
      newSocket.emit('join', 'anonymous');
    });

    newSocket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    newSocket.on('global_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const fetchNotifications = async () => {};
  const markNotificationsAsRead = async () => {};
  const login = async () => ({});
  const register = async () => ({});
  const verifyOtp = async () => ({});
  const googleSignIn = async () => ({});
  const forgotPassword = async () => ({});
  const resetPassword = async () => ({});
  const logout = () => {};

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      token,
      loading,
      notifications,
      socket,
      verifyEmail: null,
      setVerifyEmail: () => {},
      login,
      register,
      verifyOtp,
      googleSignIn,
      forgotPassword,
      resetPassword,
      logout,
      markNotificationsAsRead,
      fetchNotifications,
      getHeaders: () => ({})
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
