import { AuthUseCases } from './application/auth.use-cases';
import { HttpAuthGateway } from './infrastructure/auth-api.gateway';

const authUseCases = new AuthUseCases(new HttpAuthGateway());

export const registerUser = authUseCases.registerUser.bind(authUseCases);
export const loginUser = authUseCases.loginUser.bind(authUseCases);
export const refreshTokens = authUseCases.refreshTokens.bind(authUseCases);
export const logoutUser = authUseCases.logoutUser.bind(authUseCases);
export const getCurrentUser = authUseCases.getCurrentUser.bind(authUseCases);

export type {
  AuthGatewayFailure,
  AuthGatewayResult,
} from './domain/auth.gateway';
export type {
  AuthCredentials,
  AuthSuccessResponse,
  AuthUser,
  RefreshResponse,
  RegisterInput,
} from './domain/auth.types';
