import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('API Client', () => {
  let clientInterceptors: { request: any[]; response: any[] };

  beforeEach(async () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });

    vi.stubGlobal('window', { location: { href: '' } });

    const clientModule = await import('../api/client');
    const client = clientModule.default;
    clientInterceptors = {
      request: client.interceptors.request.handlers ?? [],
      response: client.interceptors.response.handlers ?? [],
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('response interceptor - success', () => {
    it('should unwrap success.data from response body', () => {
      const handler = clientInterceptors.response[0];
      const response = { data: { success: true, data: { id: '1' } } };
      const result = handler.fulfilled(response);
      expect(result.data).toEqual({ id: '1' });
    });

    it('should return response as-is when not wrapped', () => {
      const handler = clientInterceptors.response[0];
      const response = { data: { id: '1' } };
      const result = handler.fulfilled(response);
      expect(result.data).toEqual({ id: '1' });
    });
  });

  describe('response interceptor - 401 refresh flow', () => {
    it('should reject auth endpoints on 401 without retry', async () => {
      const handler = clientInterceptors.response[0];
      const error = {
        config: { url: '/api/v1/auth/login', _retry: false },
        response: { status: 401 },
      };

      await expect(handler.rejected(error)).rejects.toEqual(error);
    });

    it('should redirect to login when no refresh token on 401', async () => {
      const handler = clientInterceptors.response[0];
      const error = {
        config: { url: '/api/v1/invoices', _retry: false, headers: {} },
        response: { status: 401 },
      };

      await expect(handler.rejected(error)).rejects.toEqual(error);
      expect(window.location.href).toBe('/login');
    });
  });
});
