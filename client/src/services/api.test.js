import mockAxios from 'axios';
import { showError } from '../utils/toast';
import logger from '../utils/logger';

jest.mock('../utils/toast', () => ({
  showError: jest.fn(),
  showToast: jest.fn(),
  showSuccess: jest.fn(),
  showWarning: jest.fn(),
  __esModule: true,
}));

jest.mock('axios', () => {
  const mockFn = jest.fn().mockResolvedValue({ data: {} });
  mockFn.get = jest.fn();
  mockFn.post = jest.fn();
  mockFn.put = jest.fn();
  mockFn.delete = jest.fn();
  mockFn.interceptors = {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  };
  mockFn.defaults = {};
  return {
    create: jest.fn(() => mockFn),
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    isCancel: jest.fn().mockReturnValue(false),
  };
});

import api, { classifyError, downloadFile, setAccessToken, API_BASE } from './api';

let reqHandler;
let resSuccessHandler;
let resErrorHandler;
let mockInstance;

beforeAll(() => {
  mockInstance = mockAxios.create.mock.results[0].value;
  reqHandler = mockInstance.interceptors.request.use.mock.calls[0][0];
  resSuccessHandler = mockInstance.interceptors.response.use.mock.calls[0][0];
  resErrorHandler = mockInstance.interceptors.response.use.mock.calls[0][1];
});

beforeEach(() => {
  showError.mockClear();
  logger.warn.mockClear();
  logger.error.mockClear();
  localStorage.clear();
  delete window.location;
  window.location = { href: '' };
});

describe('classifyError', () => {
  it('classifies network error (no response)', () => {
    const err = new Error('Network error');
    const result = classifyError(err);
    expect(result).toEqual({
      text: 'Нет подключения к серверу. Проверьте интернет.',
      sourceCode: 'NETWORK',
    });
  });

  it.each([
    [400, 'VALIDATION_ERROR', 'Проверьте введённые данные.'],
    [401, undefined, 'Что-то пошло не так. Попробуйте ещё раз.'],
    [403, 'FORBIDDEN', 'У вас нет доступа к этому.'],
    [404, 'NOT_FOUND', 'Запись не найдена.'],
    [409, 'CONFLICT', 'Такие данные уже существуют.'],
    [422, 'VALIDATION_ERROR', 'Проверьте введённые данные.'],
    [500, 'DATABASE_ERROR', 'Ошибка базы данных. Попробуйте позже.'],
    [502, 'SYSTEM_ERROR', 'Техническая ошибка. Попробуйте позже.'],
    [503, 'TOO_MANY_REQUESTS', 'Слишком много запросов. Подождите немного.'],
  ])('classifies %i with errorCode %s', (status, errorCode, expectedText) => {
    const err = {
      response: { status, data: { error: errorCode } },
    };
    const result = classifyError(err);
    expect(result).toEqual({
      text: expectedText,
      sourceCode: `SERVER_${status}`,
    });
  });

  it('prefers serverMsg over errorCode', () => {
    const err = {
      response: {
        status: 500,
        data: { error: 'DATABASE_ERROR', message: 'Custom server message' },
      },
    };
    const result = classifyError(err);
    expect(result.text).toBe('Custom server message');
    expect(result.sourceCode).toBe('SERVER_500');
  });

  it('uses fallback text for unknown errorCode', () => {
    const err = {
      response: {
        status: 418,
        data: { error: 'UNKNOWN_CODE' },
      },
    };
    const result = classifyError(err);
    expect(result).toEqual({
      text: 'Что-то пошло не так. Попробуйте ещё раз.',
      sourceCode: 'SERVER_418',
    });
  });

  it('uses generic fallback when no errorCode or serverMsg', () => {
    const err = {
      response: { status: 500, data: {} },
    };
    const result = classifyError(err);
    expect(result).toEqual({
      text: 'Что-то пошло не так. Попробуйте ещё раз.',
      sourceCode: 'SERVER_500',
    });
  });

  it('sets sourceCode based on side if present', () => {
    const err = {
      response: { status: 422, data: { side: 'backend', error: 'VALIDATION_ERROR' } },
    };
    const result = classifyError(err);
    expect(result.sourceCode).toBe('SERVER_422');
  });
});

describe('request interceptor (cookie-only + CSRF)', () => {
  it('adds X-CSRF-Token on mutating request when XSRF-TOKEN cookie present', async () => {
    document.cookie = 'XSRF-TOKEN=tok123';
    const config = { method: 'post', headers: {} };
    const result = await reqHandler(config);
    expect(result.headers['X-CSRF-Token']).toBe('tok123');
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('does not add CSRF header on GET requests', async () => {
    document.cookie = 'XSRF-TOKEN=tok123';
    const config = { method: 'get', headers: {} };
    const result = await reqHandler(config);
    expect(result.headers['X-CSRF-Token']).toBeUndefined();
  });
});

describe('response interceptor', () => {
  it('passes through successful responses', () => {
    const response = { data: 'ok' };
    expect(resSuccessHandler(response)).toBe(response);
  });

  it('handles non-401 errors by calling showError and rejecting', async () => {
    const error = {
      response: { status: 500, data: { error: 'DATABASE_ERROR' } },
      config: { url: '/test', headers: {} },
    };

    await expect(resErrorHandler(error)).rejects.toBe(error);
    expect(showError).toHaveBeenCalledWith('[Сервер 500] Ошибка базы данных. Попробуйте позже.');
    expect(logger.warn).toHaveBeenCalledWith(
      'API Error (SERVER_500):',
      500,
      { error: 'DATABASE_ERROR' },
    );
  });

  it('handles 401 on refresh endpoint by clearing tokens and redirecting', async () => {
    setAccessToken('t');
    const error = {
      response: { status: 401 },
      config: { url: '/auth/refresh-token', headers: {} },
    };

    await expect(resErrorHandler(error)).rejects.toBe(error);
    expect(window.location.href).toBe('/login?expired=true');
  });

  it('refreshes token on 401 and retries original request', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { token: 'new-token', refreshToken: 'new-rt', refreshTokenExpiresAt: '2026-01-01' },
    });
    mockInstance.mockResolvedValueOnce({ data: 'from-mock' });

    const error = {
      response: { status: 401 },
      config: { url: '/data', headers: {} },
    };

    const result = await resErrorHandler(error);

    expect(mockAxios.post).toHaveBeenCalledWith(
      `${API_BASE}/auth/refresh-token`,
      {},
      { withCredentials: true },
    );
    // Токен в JS не храним — после refresh сервер выставил новые cookie, запрос ретраится.
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/data', headers: {}, _retry: true,
    });
    expect(result).toEqual({ data: 'from-mock' });
  });

  it('redirects to login when token refresh fails', async () => {
    const refreshError = new Error('Refresh failed');
    mockAxios.post.mockRejectedValueOnce(refreshError);

    const error = {
      response: { status: 401 },
      config: { url: '/data', headers: {} },
    };

    await expect(resErrorHandler(error)).rejects.toBe(refreshError);
    expect(window.location.href).toBe('/login?expired=true');
  });

  it('queues concurrent 401 requests and retries after refresh', async () => {
    let refreshResolve;
    mockAxios.post.mockImplementationOnce(() => new Promise(resolve => {
      refreshResolve = resolve;
    }));
    mockInstance.mockResolvedValue({ data: 'from-mock' });

    const error1 = {
      response: { status: 401 },
      config: { url: '/data', headers: {} },
    };
    const error2 = {
      response: { status: 401 },
      config: { url: '/other', headers: {} },
    };

    const promise1 = resErrorHandler(error1);
    const promise2 = resErrorHandler(error2);
    refreshResolve({
      data: { token: 't', refreshToken: 'rt', refreshTokenExpiresAt: '2026-01-01' },
    });

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/data', headers: {}, _retry: true,
    });
    expect(mockInstance).toHaveBeenCalledWith({
      url: '/other', headers: {}, _retry: true,
    });
    expect(result1).toEqual({ data: 'from-mock' });
    expect(result2).toEqual({ data: 'from-mock' });
  });

  it('uses serverMsg in showError for non-401 errors', async () => {
    const error = {
      response: { status: 422, data: { message: 'Invalid input' } },
      config: { url: '/test', headers: {} },
    };

    await expect(resErrorHandler(error)).rejects.toBe(error);
    expect(showError).toHaveBeenCalledWith('[Сервер] Invalid input');
  });
});

describe('downloadFile', () => {
  beforeEach(() => {
    global.URL.createObjectURL = jest.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = jest.fn();
  });

  it('creates a blob URL and triggers download', async () => {
    const blobData = new Blob(['test content']);
    mockInstance.get.mockResolvedValueOnce({ data: blobData });

    const appendChildSpy = jest.spyOn(document.body, 'appendChild');
    const removeChildSpy = jest.spyOn(document.body, 'removeChild');

    await downloadFile('/report.pdf', 'report.pdf');

    expect(mockInstance.get).toHaveBeenCalledWith('/report.pdf', { responseType: 'blob' });
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');

    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
