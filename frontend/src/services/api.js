import axios from 'axios';
import { ENDPOINTS } from './endpoints';
import { STORAGE_KEYS } from '../utils/constants';

const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

export const getAccessToken = () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
export const getRefreshToken = () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

export function setTokens({ accessToken, refreshToken } = {}) {
  if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Single-flight refresh: concurrent 401s wait on the same refresh request.
let refreshPromise = null;

async function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}${ENDPOINTS.auth.refresh}`, { refreshToken: getRefreshToken() })
      .then((res) => {
        const data = res.data?.data || {};
        setTokens(data);
        return data;
      }) 
      .finally(() => {
        refreshPromise = null;
      });
      // .then((result) => {
      //   refreshPromise = null;
      //   return result;
      // })
      // .catch((err) => {
      //   refreshPromise = null;
      //   throw err;
      // });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const isAuthCall =
      config?.url?.includes(ENDPOINTS.auth.login) ||
      config?.url?.includes(ENDPOINTS.auth.register) ||
      config?.url?.includes(ENDPOINTS.auth.refresh);

    if (response?.status === 401 && !config._retry && !isAuthCall && getRefreshToken()) {
      config._retry = true;
      try {
        await refreshTokens();
        return api(config);
      } catch {
        clearTokens();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

/** Unwrap the backend envelope { success, data, meta }. */
export const unwrap = (res) => res.data?.data;
export const unwrapMeta = (res) => res.data?.meta;

export default api;
