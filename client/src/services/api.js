import axios from 'axios';
import { showError } from '../utils/toast';

const API_BASE = 'http://localhost:5000/api';

const errorMessages = {
  // Серверные ошибки
  INTERNAL_ERROR: 'Что-то пошло не так. Попробуйте ещё раз.',
  DATABASE_ERROR: 'Ошибка базы данных. Попробуйте позже.',
  SYSTEM_ERROR: 'Техническая ошибка. Попробуйте позже.',

  // Ошибки валидации
  VALIDATION_ERROR: 'Проверьте введённые данные.',
  NOT_FOUND: 'Запись не найдена.',
  CONFLICT: 'Такие данные уже существуют.',
  VALUE_ERROR: 'Некорректное значение.',

  // Ошибки авторизации
  UNAUTHORIZED: 'Сессия истекла. Войдите снова.',
  FORBIDDEN: 'У вас нет доступа к этому.',

  // Специфичные ошибки
  TOKEN_EXPIRED: 'Сессия истекла. Войдите снова.',
  INVALID_TOKEN: 'Недействительный токен. Войдите снова.',
};

const translateError = (err) => {
  const data = err.response?.data;
  if (!data) {
    if (!err.response) {
      return 'Нет подключения к серверу. Проверьте интернет.';
    }
    return errorMessages.INTERNAL_ERROR;
  }

  const { error, message } = data;
  if (error && errorMessages[error]) {
    return errorMessages[error];
  }
  if (message) {
    return message;
  }
  return errorMessages.INTERNAL_ERROR;
};

const handleError = (err) => {
  const translatedMessage = translateError(err);
  showError(translatedMessage);
  return err;
};

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

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url.includes('/auth/refresh-token')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiresAt');
        window.location.href = '/login?expired=true';
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;
      
      if (isRefreshing) {
        return new Promise(resolve => {
          subscribeTokenRefresh(() => {
            resolve(api(originalRequest));
          });
        });
      }
      
      isRefreshing = true;
      
      try {
        const refreshRes = await axios.post(`${API_BASE}/auth/refresh-token`, {}, { withCredentials: true });
        const { token, refreshToken, refreshTokenExpiresAt } = refreshRes.data;
        if (token) {
          localStorage.setItem('token', token);
        }
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        if (refreshTokenExpiresAt) {
          localStorage.setItem('refreshTokenExpiresAt', refreshTokenExpiresAt);
        }
        onRefreshed('refreshed');
        isRefreshing = false;
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('refreshTokenExpiresAt');
        window.location.href = '/login?expired=true';
        return Promise.reject(refreshError);
      }
    }

    const status = error.response?.status;
    console.error('API Error:', status, error.response?.data);
    if (status && status !== 400 && status !== 404 && status !== 409) {
      handleError(error);
    }
    
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
