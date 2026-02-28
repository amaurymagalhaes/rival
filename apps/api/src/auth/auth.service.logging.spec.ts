import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { getLoggerToken } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';

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
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('tok') } },
        { provide: getLoggerToken(AuthService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should log info on successful registration', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    prisma.user.create.mockResolvedValue({
      id: 'u1', email: 'a@b.com', name: null, createdAt: new Date(),
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

  it('should log warn on failed login (wrong password)', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1', email: 'a@b.com', passwordHash: 'hashed',
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
      id: 'u1', email: 'a@b.com', name: 'A', passwordHash: 'hashed',
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
      id: 'u1', email: 'a@b.com', name: null, createdAt: new Date(),
    });

    await service.register({ email: 'a@b.com', password: 'SuperSecret!' });

    // Check all log calls don't contain the password
    for (const call of mockLogger.info.mock.calls) {
      const logStr = JSON.stringify(call);
      expect(logStr).not.toContain('SuperSecret!');
    }
  });
});
