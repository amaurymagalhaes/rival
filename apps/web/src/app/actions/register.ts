'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createApiUrl } from '@/lib/api';

export type RegisterState = {
  error?: string;
} | null;

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string | null;

  const body: Record<string, string> = { email, password };
  if (name) body.name = name;

  const res = await fetch(createApiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) {
      return { error: 'An account with this email already exists' };
    }
    const message =
      Array.isArray(data.message) ? data.message[0] : data.message;
    return { error: message || 'Registration failed' };
  }

  const { accessToken } = await res.json();
  const cookieStore = await cookies();
  cookieStore.set('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });

  redirect('/dashboard');
}
