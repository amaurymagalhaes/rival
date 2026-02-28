import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { USER_ROLES } from '../contexts/auth/domain/auth.role';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: JwtService;
  let prisma: PrismaService;

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('signed.jwt.token'),
  };

  const mockPrisma = {
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get<JwtService>(JwtService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('generateAccessToken', () => {
    it('signs a JWT with sub, email, and role', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        role: USER_ROLES.USER,
      };

      const token = service.generateAccessToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'test@example.com',
        role: 'USER',
      });
      expect(token).toBe('signed.jwt.token');
    });

    it('includes ADMIN role when user is admin', () => {
      const user = {
        id: 'admin-1',
        email: 'admin@example.com',
        role: USER_ROLES.ADMIN,
      };

      service.generateAccessToken(user);

      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 'admin-1',
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });
  });

  describe('generateRefreshToken', () => {
    it('returns a 64-character hex string', () => {
      const token = service.generateRefreshToken();

      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates unique tokens on each call', () => {
      const token1 = service.generateRefreshToken();
      const token2 = service.generateRefreshToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('hashToken', () => {
    it('returns a consistent SHA-256 hex digest', () => {
      const token = 'abc123';

      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('does not return the original token', () => {
      const token = 'abc123';
      const hash = service.hashToken(token);

      expect(hash).not.toBe(token);
    });
  });

  describe('compareTokenHash', () => {
    it('returns true for matching token and hash', () => {
      const token = 'test-token';
      const hash = service.hashToken(token);

      expect(service.compareTokenHash(token, hash)).toBe(true);
    });

    it('returns false for non-matching token and hash', () => {
      const hash = service.hashToken('correct-token');

      expect(service.compareTokenHash('wrong-token', hash)).toBe(false);
    });
  });

  describe('saveRefreshToken', () => {
    it('creates a refresh token record in DB', async () => {
      const expiresAt = new Date('2025-01-01');
      mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      await service.saveRefreshToken('user-1', 'hashed-token', expiresAt);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data: {
          tokenHash: 'hashed-token',
          userId: 'user-1',
          expiresAt,
        },
      });
    });
  });

  describe('findRefreshToken', () => {
    it('looks up a token by hash', async () => {
      const mockToken = {
        id: 'rt-1',
        tokenHash: 'hashed',
        userId: 'user-1',
        isRevoked: false,
        expiresAt: new Date(),
      };
      mockPrisma.refreshToken.findFirst.mockResolvedValue(mockToken);

      const result = await service.findRefreshToken('hashed');

      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: 'hashed' },
      });
      expect(result).toEqual(mockToken);
    });
  });

  describe('revokeToken', () => {
    it('sets isRevoked to true', async () => {
      await service.revokeToken('rt-1');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true },
      });
    });

    it('sets replacedByHash when provided', async () => {
      await service.revokeToken('rt-1', 'new-hash');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isRevoked: true, replacedByHash: 'new-hash' },
      });
    });
  });

  describe('revokeAllUserTokens', () => {
    it('revokes all non-revoked tokens for a user', async () => {
      await service.revokeAllUserTokens('user-1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRevoked: false },
        data: { isRevoked: true },
      });
    });
  });
});
