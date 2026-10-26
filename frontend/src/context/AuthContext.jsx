import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));
  const navigate = useNavigate();

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Any 401 from the API (expired token, deactivated account) ends the session.
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Restore the session from a stored token.
  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(({ user: u }) => setUser(u))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password, remember) => {
    const { token, user: u } = await authApi.login(email, password);
    tokenStore.set(token, remember);
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, isAdmin: user?.role === 'admin' }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
