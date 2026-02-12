import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext(null);

const TOKEN_KEY = 'immate_token';
const USER_KEY = 'immate_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      })
      .catch(() => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const getAuthHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
