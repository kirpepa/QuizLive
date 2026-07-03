import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from a stored access token on first load.
  useEffect(() => {
    async function bootstrap() {
      if (!tokenStore.access) {
        setLoading(false);
        return;
      }
      try {
        const data = await api('/api/auth/me');
        setUser(data.user);
      } catch {
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, []);

  async function login(email, password) {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api('/api/auth/register', { method: 'POST', body: payload });
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth должен использоваться внутри AuthProvider');
  return ctx;
}
