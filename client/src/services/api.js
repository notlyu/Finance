import axios from 'axios';
import { showError } from '../utils/toast';
import logger from '../utils/logger';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export const classifyError = (err) => {
  if (!err.response) {
    return { text: 'Нет подключения к серверу. Проверьте интернет.', sourceCode: 'NETWORK' };
  }

  const status = err.response.status;
  const data = err.response.data;
  const side = data?.side;
  const errorCode = data?.error;
  const serverMsg = data?.message;

  // Если сервер явно указал side — доверяем ему
  let sourceCode;
  if (side === 'backend') {
    sourceCode = `SERVER_${status}`;
  } else {
    // Фронтенд сам определил проблему (4xx/5xx от сервера)
    sourceCode = `SERVER_${status}`;
  }

  // Пытаемся получить читаемое сообщение
  let text;
  if (serverMsg) {
    text = serverMsg;
  } else if (errorCode) {
    const map = {
      VALIDATION_ERROR: 'Проверьте введённые данные.',
      NOT_FOUND: 'Запись не найдена.',
      CONFLICT: 'Такие данные уже существуют.',
      UNAUTHORIZED: 'Сессия истекла. Войдите снова.',
      FORBIDDEN: 'У вас нет доступа к этому.',
      DATABASE_ERROR: 'Ошибка базы данных. Попробуйте позже.',
      SYSTEM_ERROR: 'Техническая ошибка. Попробуйте позже.',
      TOO_MANY_REQUESTS: 'Слишком много запросов. Подождите немного.',
    };
    text = map[errorCode] || 'Что-то пошло не так. Попробуйте ещё раз.';
  } else {
    text = 'Что-то пошло не так. Попробуйте ещё раз.';
  }

  return { text, sourceCode };
};

let accessToken = null;

export const setAccessToken = (token) => { accessToken = token; };
export const getAccessToken = () => accessToken;
export const clearAccessToken = () => { accessToken = null; };

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token) => {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
};

const onRefreshFailed = () => {
  refreshSubscribers.forEach(callback => callback(null));
  refreshSubscribers = [];
};

api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh-token')) {
        clearAccessToken();
        window.location.href = '/login?expired=true';
        return Promise.reject(error);
      }

      if (originalRequest.url.includes('/auth/login') || originalRequest.url.includes('/auth/register')) {
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (token) {
              resolve(api(originalRequest));
            } else {
              reject(error);
            }
          });
        });
      }
      
      isRefreshing = true;
      
      try {
        const refreshRes = await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
        const { token } = refreshRes.data;
        if (token) {
          setAccessToken(token);
        }
        onRefreshed('refreshed');
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        onRefreshFailed();
        clearAccessToken();
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      }
    }

    const classified = classifyError(error);
    const prefixMap = {
      NETWORK: '[Сеть]',
      SERVER_500: '[Сервер 500]',
      SERVER_502: '[Сервер 502]',
      SERVER_503: '[Сервер 503]',
    };
    const prefix = prefixMap[classified.sourceCode] || '[Сервер]';
    const fullMessage = `${prefix} ${classified.text}`;

    logger.warn(`API Error (${classified.sourceCode}):`, error.response?.status, error.response?.data);
    showError(fullMessage);

    return Promise.reject(error);
  }
);

export const downloadFile = async (url, filename) => {
  const response = await api.get(url, {
    responseType: 'blob',
  });
  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
};

export default api;
export { API_BASE };
