'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function logout(): Promise<never> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
  redirect('/login');
}
