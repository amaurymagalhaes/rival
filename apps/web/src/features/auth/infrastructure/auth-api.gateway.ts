import { createApiUrl } from '@/lib/api';
import type {
  AuthGateway,
  AuthGatewayFailure,
  AuthGatewayResult,
} from '../domain/auth.gateway';
import type {
  AuthCredentials,
  AuthSuccessResponse,
  AuthUser,
  RefreshResponse,
  RegisterInput,
} from '../domain/auth.types';

type JsonWithMessage = {
  message?: unknown;
};

function parseMessage(rawBody: string): string | undefined {
  const trimmed = rawBody.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed) as JsonWithMessage;
    const message = Array.isArray(parsed.message)
      ? parsed.message[0]
      : parsed.message;
    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  } catch {
    return undefined;
  }

  return undefined;
}

async function toFailure(response: Response): Promise<AuthGatewayFailure> {
  const rawBody = await response.text().catch(() => '');
  const trimmedBody = rawBody.trim();

  return {
    ok: false,
    status: response.status,
    message: parseMessage(rawBody),
    requestId: response.headers.get('x-request-id') ?? undefined,
    rawBody: trimmedBody ? trimmedBody : undefined,
  };
}

async function toResult<T>(response: Response): Promise<AuthGatewayResult<T>> {
  if (!response.ok) {
    return toFailure(response);
  }

  return {
    ok: true,
    data: (await response.json()) as T,
  };
}

export class HttpAuthGateway implements AuthGateway {
  register(
    payload: RegisterInput,
  ): Promise<AuthGatewayResult<AuthSuccessResponse>> {
    return fetch(createApiUrl('/auth/register'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((response) => toResult<AuthSuccessResponse>(response));
  }

  login(payload: AuthCredentials): Promise<AuthGatewayResult<AuthSuccessResponse>> {
    return fetch(createApiUrl('/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then((response) => toResult<AuthSuccessResponse>(response));
  }

  refresh(refreshToken: string): Promise<AuthGatewayResult<RefreshResponse>> {
    return fetch(createApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then((response) => toResult<RefreshResponse>(response));
  }

  logout(
    refreshToken: string,
    headers: Record<string, string>,
  ): Promise<AuthGatewayResult<{ message: string }>> {
    return fetch(createApiUrl('/auth/logout'), {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).then((response) => toResult<{ message: string }>(response));
  }

  currentUser(
    headers: Record<string, string>,
  ): Promise<AuthGatewayResult<AuthUser>> {
    return fetch(createApiUrl('/auth/me'), { headers }).then((response) =>
      toResult<AuthUser>(response),
    );
  }
}
