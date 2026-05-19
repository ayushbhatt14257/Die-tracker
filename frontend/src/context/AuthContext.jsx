import { createContext, useContext, useState } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dt_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (username, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ username, password });
      if (data.success) {
        localStorage.setItem('dt_token', data.data.token);
        localStorage.setItem('dt_user', JSON.stringify(data.data.user));
        setUser(data.data.user);
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('dt_token');
    localStorage.removeItem('dt_user');
    setUser(null);
  };

  const isOwner = user?.role === 'owner' || user?.role === 'admin';
  const isDesigner = user?.role === 'designer';
  const isProgrammer = user?.role === 'programmer';
  const isVMC = user?.role === 'vmc_operator';
  const isWirecut = user?.role === 'wirecut_operator';
  const isToolroom = user?.role === 'toolroom_head';
  const isGR1Receiver = user?.role === 'gr1_receiver';

  return (
    <AuthContext.Provider value={{
      user, login, logout, loading,
      isOwner, isDesigner, isProgrammer, isVMC, isWirecut, isToolroom, isGR1Receiver,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
