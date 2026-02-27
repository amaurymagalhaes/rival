export function createApiUrl(path: string): string {
  const baseUrl = process.env.API_URL;
  if (!baseUrl) {
    throw new Error('API_URL environment variable is not set');
  }
  return `${baseUrl}${path}`;
}
