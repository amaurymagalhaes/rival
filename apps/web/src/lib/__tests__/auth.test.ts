const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  }),
}));

const mockRefreshTokens = jest.fn();
jest.mock('@/features/auth', () => ({
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}));

import { getToken, refreshAccessToken, getAuthHeaders } from '../auth';

describe('auth lib', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_URL = 'http://api.local';
  });

  describe('getToken', () => {
    it('returns access token from cookies', async () => {
      mockGet.mockReturnValue({ value: 'jwt-token' });

      const token = await getToken();

      expect(token).toBe('jwt-token');
      expect(mockGet).toHaveBeenCalledWith('token');
    });

    it('returns undefined when no cookie exists', async () => {
      mockGet.mockReturnValue(undefined);

      const token = await getToken();

      expect(token).toBeUndefined();
    });
  });

  describe('refreshAccessToken', () => {
    it('returns new access token on successful refresh', async () => {
      mockGet.mockImplementation((name: string) =>
        name === 'refreshToken' ? { value: 'old-rt' } : undefined,
      );
      mockRefreshTokens.mockResolvedValue({
        ok: true,
        data: {
          accessToken: 'new-at',
          refreshToken: 'new-rt',
        },
      });

      const result = await refreshAccessToken();

      expect(result).toBe('new-at');
      expect(mockRefreshTokens).toHaveBeenCalledWith('old-rt');
      expect(mockSet).toHaveBeenCalledWith(
        'token',
        'new-at',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockSet).toHaveBeenCalledWith(
        'refreshToken',
        'new-rt',
        expect.objectContaining({ httpOnly: true }),
      );
    });

    it('returns null and clears cookies when refresh fails', async () => {
      mockGet.mockImplementation((name: string) =>
        name === 'refreshToken' ? { value: 'expired-rt' } : undefined,
      );
      mockRefreshTokens.mockResolvedValue({ ok: false });

      const result = await refreshAccessToken();

      expect(result).toBeNull();
      expect(mockDelete).toHaveBeenCalledWith('token');
      expect(mockDelete).toHaveBeenCalledWith('refreshToken');
    });

    it('returns null when no refresh token cookie exists', async () => {
      mockGet.mockReturnValue(undefined);

      const result = await refreshAccessToken();

      expect(result).toBeNull();
      expect(mockRefreshTokens).not.toHaveBeenCalled();
    });
  });

  describe('getAuthHeaders', () => {
    it('returns auth header when access token exists', async () => {
      mockGet.mockImplementation((name: string) =>
        name === 'token' ? { value: 'jwt-token' } : undefined,
      );

      const headers = await getAuthHeaders();

      expect(headers).toEqual({ Authorization: 'Bearer jwt-token' });
    });

    it('attempts refresh when no access token but refresh token exists', async () => {
      mockGet.mockImplementation((name: string) => {
        if (name === 'token') return undefined;
        if (name === 'refreshToken') return { value: 'rt' };
        return undefined;
      });
      mockRefreshTokens.mockResolvedValue({
        ok: true,
        data: {
          accessToken: 'new-at',
          refreshToken: 'new-rt',
        },
      });

      const headers = await getAuthHeaders();

      expect(headers).toEqual({ Authorization: 'Bearer new-at' });
    });

    it('returns empty object when no tokens exist', async () => {
      mockGet.mockReturnValue(undefined);

      const headers = await getAuthHeaders();

      expect(headers).toEqual({});
    });
  });
});
