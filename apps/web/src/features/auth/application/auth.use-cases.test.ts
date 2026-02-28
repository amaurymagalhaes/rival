import { AuthUseCases } from './auth.use-cases';
import type { AuthGateway } from '../domain/auth.gateway';

describe('AuthUseCases', () => {
  const gateway: jest.Mocked<AuthGateway> = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    currentUser: jest.fn(),
  };

  const useCases = new AuthUseCases(gateway);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns validation error for invalid register email', async () => {
    const result = await useCases.registerUser({
      email: 'bad-email',
      password: 'password123',
    });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: 'Please provide a valid email address',
    });
    expect(gateway.register).not.toHaveBeenCalled();
  });

  it('normalizes login email before delegating to gateway', async () => {
    gateway.login.mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Invalid credentials',
    });

    await useCases.loginUser({
      email: '  USER@Example.COM  ',
      password: 'password123',
    });

    expect(gateway.login).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
    });
  });
});
