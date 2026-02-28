'use server';

import { redirect, unstable_rethrow } from 'next/navigation';
import { registerUser } from '@/features/auth';
import type { RegisterInput } from '@/features/auth/domain/auth.types';
import { setAuthCookies } from '@/lib/cookies';

export type RegisterState = {
  error?: string;
} | null;

function getRegistrationErrorMessage(
  status: number,
  apiMessage?: string,
): string {
  if (status === 409) {
    return 'An account with this email already exists';
  }
  if (status === 429) {
    return 'Too many registration attempts. Please wait a minute and try again.';
  }
  if (status >= 500) {
    return 'We could not create your account right now. Please try again shortly.';
  }
  if (apiMessage) {
    return apiMessage;
  }
  return 'Unable to complete registration right now. Please try again.';
}

export async function register(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const name = formData.get('name') as string | null;

  const body: RegisterInput = { email, password };
  if (name) body.name = name;

  try {
    const result = await registerUser(body);
    if (!result.ok) {
      console.error('Registration API returned non-success response', {
        status: result.status,
        requestId: result.requestId,
        apiMessage: result.message,
        responseSnippet: result.rawBody?.slice(0, 200),
      });

      return { error: getRegistrationErrorMessage(result.status, result.message) };
    }

    const { accessToken, refreshToken } = result.data;
    await setAuthCookies(accessToken, refreshToken);

    redirect('/dashboard');
  } catch (error) {
    unstable_rethrow(error);
    console.error('Registration request failed before reaching API', {
      error,
      email,
    });
    return {
      error:
        'Unable to reach the registration service. Please check your connection and try again.',
    };
  }
}
