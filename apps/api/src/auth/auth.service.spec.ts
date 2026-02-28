import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';
import * as bcrypt from 'bcrypt';
import { PrismaAuthUserRepository } from '../contexts/auth/infrastructure/prisma-auth-user.repository';
import { TokenServiceAuthTokenAdapter } from '../contexts/auth/infrastructure/token-service-auth-token.adapter';
import { RegisterUserUseCase } from '../contexts/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../contexts/auth/application/use-cases/login-user.use-case';
import { RefreshSessionUseCase } from '../contexts/auth/application/use-cases/refresh-session.use-case';
import { LogoutSessionUseCase } from '../contexts/auth/application/use-cases/logout-session.use-case';
import { GetCurrentUserUseCase } from '../contexts/auth/application/use-cases/get-current-user.use-case';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { create: jest.Mock; findUnique: jest.Mock };
    refreshToken: {
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let tokenService: {
    generateAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    hashToken: jest.Mock;
    compareTokenHash: jest.Mock;
    saveRefreshToken: jest.Mock;
    findRefreshToken: jest.Mock;
    revokeToken: jest.Mock;
    revokeAllUserTokens: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    tokenService = {
      generateAccessToken: jest.fn().mockReturnValue('mock-access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      hashToken: jest.fn().mockReturnValue('hashed-refresh-token'),
      compareTokenHash: jest.fn().mockReturnValue(true),
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
      findRefreshToken: jest.fn(),
      revokeToken: jest.fn().mockResolvedValue(undefined),
      revokeAllUserTokens: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: TokenService, useValue: tokenService },
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
        mockLoggerProvider(AuthService.name),
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('hashes password with 12 rounds and returns accessToken + refreshToken', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: null,
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.register({
        email: 'test@test.com',
        password: 'TestPass123!',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123!', 12);
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@test.com',
          role: 'USER',
        }),
      );
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    });

    it('hashes refresh token before storing in DB', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: null,
        role: 'USER',
        createdAt: new Date(),
      });

      await service.register({
        email: 'test@test.com',
        password: 'TestPass123!',
      });

      expect(tokenService.hashToken).toHaveBeenCalledWith(
        'mock-refresh-token',
      );
      expect(tokenService.saveRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'hashed-refresh-token',
        expect.any(Date),
      );
    });

    it('throws ConflictException on duplicate email', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prisma.user.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.register({ email: 'dup@test.com', password: 'TestPass123!' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns accessToken + refreshToken for valid credentials and excludes passwordHash', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@test.com',
        password: 'TestPass123!',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('TestPass123!', 'hashed');
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-1',
          email: 'test@test.com',
          role: 'USER',
        }),
      );
      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
      });
    });

    it('hashes refresh token before storing in DB', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: 'test@test.com',
        password: 'TestPass123!',
      });

      expect(tokenService.hashToken).toHaveBeenCalledWith(
        'mock-refresh-token',
      );
      expect(tokenService.saveRefreshToken).toHaveBeenCalledWith(
        'user-1',
        'hashed-refresh-token',
        expect.any(Date),
      );
    });

    it('throws UnauthorizedException for wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        role: 'USER',
        passwordHash: 'hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@test.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    const validTokenRecord = {
      id: 'rt-1',
      tokenHash: 'hashed-token',
      userId: 'user-1',
      isRevoked: false,
      expiresAt: new Date(Date.now() + 86400000),
      replacedByHash: null,
      createdAt: new Date(),
    };

    it('returns new token pair for valid refresh token', async () => {
      tokenService.findRefreshToken.mockResolvedValue(validTokenRecord);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.refresh('old-refresh-token');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', 'mock-refresh-token');
    });

    it('revokes old token after rotation (sets replacedByHash)', async () => {
      tokenService.findRefreshToken.mockResolvedValue(validTokenRecord);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'USER',
        createdAt: new Date(),
      });

      await service.refresh('old-refresh-token');

      expect(tokenService.revokeToken).toHaveBeenCalledWith(
        'rt-1',
        'hashed-refresh-token',
      );
    });

    it('throws 401 for non-existent token', async () => {
      tokenService.findRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws 401 for expired token', async () => {
      tokenService.findRefreshToken.mockResolvedValue({
        ...validTokenRecord,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenService.revokeToken).toHaveBeenCalledWith('rt-1');
    });

    it('revokes ALL user tokens on reuse detection (revoked token replayed)', async () => {
      tokenService.findRefreshToken.mockResolvedValue({
        ...validTokenRecord,
        isRevoked: true,
      });

      await expect(service.refresh('stolen-token')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(tokenService.revokeAllUserTokens).toHaveBeenCalledWith('user-1');
    });

    it('fetches fresh role from DB (handles role changes)', async () => {
      tokenService.findRefreshToken.mockResolvedValue(validTokenRecord);
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@test.com',
        name: 'Test',
        role: 'ADMIN',
        createdAt: new Date(),
      });

      await service.refresh('old-refresh-token');

      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'ADMIN' }),
      );
    });
  });

  describe('logout', () => {
    it('revokes the refresh token', async () => {
      tokenService.findRefreshToken.mockResolvedValue({
        id: 'rt-1',
        isRevoked: false,
        tokenHash: 'hashed',
        userId: 'user-1',
        expiresAt: new Date(),
        replacedByHash: null,
        createdAt: new Date(),
      });

      await service.logout('valid-token');

      expect(tokenService.revokeToken).toHaveBeenCalledWith('rt-1');
    });

    it('does not throw if token does not exist', async () => {
      tokenService.findRefreshToken.mockResolvedValue(null);

      await expect(service.logout('nonexistent')).resolves.not.toThrow();
    });

    it('does not throw if token already revoked', async () => {
      tokenService.findRefreshToken.mockResolvedValue({
        id: 'rt-1',
        isRevoked: true,
        tokenHash: 'hashed',
        userId: 'user-1',
        expiresAt: new Date(),
        replacedByHash: null,
        createdAt: new Date(),
      });

      await expect(service.logout('revoked-token')).resolves.not.toThrow();
    });
  });
});
