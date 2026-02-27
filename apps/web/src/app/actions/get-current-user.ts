'use server';

import { createApiUrl } from '@/lib/api';
import { getAuthHeaders } from '@/lib/auth';

export type User = {
  id: string;
  email: string;
  name: string | null;
};

export async function getCurrentUser(): Promise<User | null> {
  const headers = await getAuthHeaders();
  if (!headers.Authorization) return null;

  const res = await fetch(createApiUrl('/auth/me'), {
    headers,
  });

  if (!res.ok) return null;
  return res.json();
}
