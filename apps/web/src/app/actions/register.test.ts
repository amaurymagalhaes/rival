import { register } from './register';

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({ set: jest.fn(), delete: jest.fn() }),
}));

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('register action', () => {
  let fetchMock: jest.Mock;
  let consoleErrorSpy: jest.SpyInstance;

  const createFormData = () => {
    const formData = new FormData();
    formData.set('email', 'user@test.com');
    formData.set('password', 'password123');
    formData.set('name', 'Test User');
    return formData;
  };

  const createMockResponse = ({
    status,
    statusText = '',
    body = '',
    headers = {},
  }: {
    status: number;
    statusText?: string;
    body?: string;
    headers?: Record<string, string>;
  }): Response =>
    ({
      ok: status >= 200 && status < 300,
      status,
      statusText,
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
      },
      text: jest.fn().mockResolvedValue(body),
    }) as unknown as Response;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env.API_URL = 'http://api.local';
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a friendly message for 5xx registration failures', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        status: 502,
        statusText: 'Bad Gateway',
        body: '<html>Bad gateway</html>',
        headers: { 'x-request-id': 'req-1' },
      }),
    );

    const result = await register(null, createFormData());

    expect(result).toEqual({
      error: 'We could not create your account right now. Please try again shortly.',
    });
  });

  it('returns throttling message for 429 responses', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        status: 429,
        body: JSON.stringify({ message: 'Too many requests', statusCode: 429 }),
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await register(null, createFormData());

    expect(result).toEqual({
      error: 'Too many registration attempts. Please wait a minute and try again.',
    });
  });

  it('does not expose raw upstream payloads when message field is missing', async () => {
    fetchMock.mockResolvedValue(
      createMockResponse({
        status: 400,
        body: JSON.stringify({
          jsonrpc: '2.0',
          error: { message: 'upstream transport detail' },
        }),
      }),
    );

    const result = await register(null, createFormData());

    expect(result).toEqual({
      error: 'Unable to complete registration right now. Please try again.',
    });
  });

  it('returns network-specific message when API cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const result = await register(null, createFormData());

    expect(result).toEqual({
      error:
        'Unable to reach the registration service. Please check your connection and try again.',
    });
  });
});
