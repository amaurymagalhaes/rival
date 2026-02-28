'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { logoutUser } from '@/features/auth';
import { getAuthHeaders } from '@/lib/auth';
import {
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
} from '@/lib/cookies';

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (refreshToken) {
    try {
      const headers = await getAuthHeaders();
      await logoutUser(refreshToken, headers);
    } catch {
      // Always proceed with local cleanup
    }
  }

  await clearAuthCookies();
  redirect('/login');
}
