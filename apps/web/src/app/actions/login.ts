'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createApiUrl } from '@/lib/api';

export type LoginState = {
  error?: string;
} | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const res = await fetch(createApiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { error: body.message || 'Invalid credentials' };
  }

  const { accessToken } = await res.json();
  const cookieStore = await cookies();
  cookieStore.set('token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });

  redirect('/dashboard');
}
