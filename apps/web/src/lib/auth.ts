import { cookies } from 'next/headers';

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
