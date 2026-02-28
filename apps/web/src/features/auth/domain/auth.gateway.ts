import type {
  AuthCredentials,
  AuthSuccessResponse,
  AuthUser,
  RefreshResponse,
  RegisterInput,
} from './auth.types';

export type AuthGatewaySuccess<T> = {
  ok: true;
  data: T;
};

export type AuthGatewayFailure = {
  ok: false;
  status: number;
  message?: string;
  requestId?: string;
  rawBody?: string;
};

export type AuthGatewayResult<T> = AuthGatewaySuccess<T> | AuthGatewayFailure;

export interface AuthGateway {
  register(payload: RegisterInput): Promise<AuthGatewayResult<AuthSuccessResponse>>;
  login(payload: AuthCredentials): Promise<AuthGatewayResult<AuthSuccessResponse>>;
  refresh(refreshToken: string): Promise<AuthGatewayResult<RefreshResponse>>;
  logout(
    refreshToken: string,
    headers: Record<string, string>,
  ): Promise<AuthGatewayResult<{ message: string }>>;
  currentUser(headers: Record<string, string>): Promise<AuthGatewayResult<AuthUser>>;
}
