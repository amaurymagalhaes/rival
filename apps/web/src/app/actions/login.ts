'use server';

import { redirect } from 'next/navigation';
import { loginUser } from '@/features/auth';
import { setAuthCookies } from '@/lib/cookies';

export type LoginState = {
  error?: string;
} | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const result = await loginUser({ email, password });

  if (!result.ok) {
    return { error: result.message || 'Invalid credentials' };
  }

  const { accessToken, refreshToken } = result.data;
  await setAuthCookies(accessToken, refreshToken);

  redirect('/dashboard');
}
