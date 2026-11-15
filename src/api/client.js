import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const baseURL = import.meta.env.VITE_API_URL || '/api';
const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el access token expira, se renueva una sola vez y se reintenta la petición.
let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error;
    const isAuthCall = config?.url?.includes('/auth/token');
    if (response?.status !== 401 || !config || config._retry || isAuthCall) {
      throw error;
    }
    config._retry = true;

    const { refresh, setTokens, logout } = useAuthStore.getState();
    if (!refresh) {
      logout();
      throw error;
    }
    try {
      refreshing =
        refreshing ||
        axios
          .post(`${baseURL}/auth/token/refresh/`, { refresh })
          .finally(() => {
            refreshing = null;
          });
      const { data } = await refreshing;
      setTokens(data.access, data.refresh || refresh);
      config.headers.Authorization = `Bearer ${data.access}`;
      return api(config);
    } catch {
      logout();
      throw error;
    }
  }
);

export default api;
