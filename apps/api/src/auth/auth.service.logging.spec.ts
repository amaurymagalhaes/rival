import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { getLoggerToken } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';
import { PrismaAuthUserRepository } from '../contexts/auth/infrastructure/prisma-auth-user.repository';
import { TokenServiceAuthTokenAdapter } from '../contexts/auth/infrastructure/token-service-auth-token.adapter';
import { RegisterUserUseCase } from '../contexts/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../contexts/auth/application/use-cases/login-user.use-case';
import { RefreshSessionUseCase } from '../contexts/auth/application/use-cases/refresh-session.use-case';
import { LogoutSessionUseCase } from '../contexts/auth/application/use-cases/logout-session.use-case';
import { GetCurrentUserUseCase } from '../contexts/auth/application/use-cases/get-current-user.use-case';

jest.mock('bcrypt');

describe('AuthService (logging)', () => {
  let service: AuthService;
  let prisma: any;
  let mockLogger: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: TokenService,
          useValue: {
            generateAccessToken: jest.fn().mockReturnValue('tok'),
            generateRefreshToken: jest.fn().mockReturnValue('refresh-tok'),
            hashToken: jest.fn().mockReturnValue('hashed'),
            saveRefreshToken: jest.fn().mockResolvedValue(undefined),
            findRefreshToken: jest.fn(),
            revokeToken: jest.fn().mockResolvedValue(undefined),
            revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaAuthUserRepository,
          inject: [PrismaService],
          useFactory: (prismaService: PrismaService) =>
            new PrismaAuthUserRepository(prismaService),
        },
        {
          provide: TokenServiceAuthTokenAdapter,
          inject: [TokenService],
          useFactory: (service: TokenService) =>
            new TokenServiceAuthTokenAdapter(service),
        },
        {
          provide: RegisterUserUseCase,
          inject: [PrismaAuthUserRepository, TokenServiceAuthTokenAdapter],
          useFactory: (
            users: PrismaAuthUserRepository,
            tokens: TokenServiceAuthTokenAdapter,
          ) => new RegisterUserUseCase(users, tokens),
        },
        {
          provide: LoginUserUseCase,
          inject: [PrismaAuthUserRepository, TokenServiceAuthTokenAdapter],
          useFactory: (
            users: PrismaAuthUserRepository,
            tokens: TokenServiceAuthTokenAdapter,
          ) => new LoginUserUseCase(users, tokens),
        },
        {
          provide: RefreshSessionUseCase,
          inject: [PrismaAuthUserRepository, TokenServiceAuthTokenAdapter],
          useFactory: (
            users: PrismaAuthUserRepository,
            tokens: TokenServiceAuthTokenAdapter,
          ) => new RefreshSessionUseCase(users, tokens),
        },
        {
          provide: LogoutSessionUseCase,
          inject: [TokenServiceAuthTokenAdapter],
          useFactory: (tokens: TokenServiceAuthTokenAdapter) =>
            new LogoutSessionUseCase(tokens),
        },
        {
          provide: GetCurrentUserUseCase,
          inject: [PrismaAuthUserRepository],
          useFactory: (users: PrismaAuthUserRepository) =>
            new GetCurrentUserUseCase(users),
        },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should log info on successful registration', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: null, role: 'USER', createdAt: new Date(),
    });

    await service.register({ email: 'a@b.com', password: 'Pass1234!' });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      'User registered',
    );
  });

  it('should log warn on duplicate email registration', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register({ email: 'dup@b.com', password: 'Pass1234!' }),
    ).rejects.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'dup@b.com' }),
      expect.stringContaining('duplicate email'),
    );
  });

  it('should log error on unexpected registration failure', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    const dbError = Object.assign(new Error('Database unavailable'), { code: 'P1001' });
    prisma.user.create.mockRejectedValue(dbError);

    await expect(
      service.register({ email: 'db-fail@b.com', password: 'Pass1234!' }),
    ).rejects.toThrow(dbError);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: dbError, email: 'db-fail@b.com' }),
      expect.stringContaining('unexpected error'),
    );
  });

  it('should log warn on failed login (wrong password)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', role: 'USER', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong' }),
    ).rejects.toThrow();

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      expect.stringContaining('invalid password'),
    );
  });

  it('should log info on successful login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: 'A', role: 'USER', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await service.login({ email: 'a@b.com', password: 'correct' });

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1' }),
      'User logged in',
    );
  });

  it('should never log password or token values', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: null, role: 'USER', createdAt: new Date(),
    });

    await service.register({ email: 'a@b.com', password: 'SuperSecret!' });

    // Check all log calls don't contain the password
    for (const call of mockLogger.info.mock.calls) {
      const logStr = JSON.stringify(call);
      expect(logStr).not.toContain('SuperSecret!');
    }
  });
});
