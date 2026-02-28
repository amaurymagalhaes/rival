'use server';

import { getAuthHeaders } from '@/lib/auth';
import { getCurrentUser } from '@/features/auth';
import type { AuthUser } from '@/features/auth/domain/auth.types';

export type User = AuthUser;

export async function getCurrentUserAction(): Promise<User | null> {
  const headers = await getAuthHeaders();
  if (!headers.Authorization) return null;

  const result = await getCurrentUser(headers);
  if (!result.ok) return null;

  return result.data;
}
