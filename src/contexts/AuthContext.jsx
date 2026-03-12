import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    api.setToken(token);
    try {
      const data = await api.getProfile();
      setUser(data.user || data);
    } catch {
      setToken(null);
      api.setToken(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.token);
    api.setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (username, email, password) => {
    const data = await api.register(username, email, password);
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    api.setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshProfile: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
