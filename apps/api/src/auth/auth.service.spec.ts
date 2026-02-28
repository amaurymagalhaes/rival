import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { mockLoggerProvider } from '../common/logger/logger.test-utils';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { create: jest.Mock; findUnique: jest.Mock } };
  let jwtService: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    jwtService = { sign: jest.fn().mockReturnValue('mock-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        mockLoggerProvider(AuthService.name),
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // TEST 1: register hashes password and returns access token
  it('register should hash password with 12 rounds and return accessToken', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', name: null, createdAt: new Date(),
    });

    const result = await service.register({
      email: 'test@test.com', password: 'TestPass123!',
    });

    expect(bcrypt.hash).toHaveBeenCalledWith('TestPass123!', 12);
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'user-1', email: 'test@test.com' }),
    );
    expect(result).toHaveProperty('accessToken', 'mock-token');
  });

  // TEST 2: register throws 409 on duplicate email
  it('register should throw ConflictException on duplicate email', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.register({ email: 'dup@test.com', password: 'TestPass123!' }),
    ).rejects.toThrow(ConflictException);
  });

  // TEST 3: login returns access token for valid credentials and excludes passwordHash
  it('login should return accessToken for valid credentials and exclude passwordHash', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', name: 'Test', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await service.login({
      email: 'test@test.com', password: 'TestPass123!',
    });

    expect(bcrypt.compare).toHaveBeenCalledWith('TestPass123!', 'hashed');
    expect(result).toHaveProperty('accessToken', 'mock-token');
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user).toEqual({ id: 'user-1', email: 'test@test.com', name: 'Test' });
  });

  // TEST 4: login throws 401 for wrong password
  it('login should throw UnauthorizedException for wrong password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1', email: 'test@test.com', passwordHash: 'hashed',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'test@test.com', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
