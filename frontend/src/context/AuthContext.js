import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { unwrap, setTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/api';
import { ENDPOINTS } from '../services/endpoints';
import { STORAGE_KEYS } from '../utils/constants';

export const AuthContext = createContext(null);

function readCachedUser() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USER)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readCachedUser);
  const [loading, setLoading] = useState(Boolean(getAccessToken()));

  const persistUser = useCallback((u) => {
    setUser(u);
    if (u) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEYS.USER);
  }, []);

  // Re-validate the session on first mount.
  useEffect(() => {
    if (!getAccessToken()) return;
    let cancelled = false;
    api
      .get(ENDPOINTS.auth.me)
      .then((res) => {
        if (!cancelled) persistUser(unwrap(res)?.user || unwrap(res));
      })
      .catch(() => {
        if (!cancelled) {
          clearTokens();
          persistUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [persistUser]);

  const login = useCallback(
    async ({ email, password }) => {
      // const res = await api.post(ENDPOINTS.auth.login, { email, password });
      // const data = unwrap(res);
      const res = await api.post(ENDPOINTS.auth.login, {
        email,
        password,
      });

      const data = unwrap(res); 

      setTokens(data);
      persistUser(data.user);
      return data.user;
    },
    [persistUser]
  );

  const register = useCallback(
    async ({ email, password, fullName, role }) => {
      await api.post(ENDPOINTS.auth.register, { email, password, fullName, role });
      // The register endpoint only returns the public user — sign in right after.
      return login({ email, password });
    },
    [login]
  );

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api.post(ENDPOINTS.auth.logout, { refreshToken }).catch(() => {});
    }
    clearTokens();
    persistUser(null);
  }, [persistUser]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [user, loading, login, register, logout]
  );

  // createElement (not JSX) so this file can keep its .js extension.
  return React.createElement(AuthContext.Provider, { value }, children);
}

export default AuthContext;
