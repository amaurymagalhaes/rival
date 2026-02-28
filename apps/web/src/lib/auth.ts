import { cookies } from 'next/headers';
import { refreshTokens } from '@/features/auth';
import type { RefreshResponse } from '@/features/auth/domain/auth.types';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  setAuthCookies,
  clearAuthCookies,
} from './cookies';

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return null;

  try {
    const result = await refreshTokens(refreshToken);
    if (!result.ok) {
      await clearAuthCookies();
      return null;
    }

    const data: RefreshResponse = result.data;
    await setAuthCookies(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await clearAuthCookies();
    return null;
  }
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  let token = await getToken();
  if (!token) {
    token = (await refreshAccessToken()) ?? undefined;
  }
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
