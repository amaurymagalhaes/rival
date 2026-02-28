import { getAuthHeaders, refreshAccessToken } from './auth';

export function createApiUrl(path: string): string {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    throw new Error('API_URL environment variable is not set');
  }
  return `${baseUrl}${path}`;
}

export async function fetchWithAuth(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const headers = await getAuthHeaders();
  const url = createApiUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: { ...headers, ...init?.headers },
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return fetch(url, {
        ...init,
        headers: {
          ...init?.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
  }

  return res;
}
