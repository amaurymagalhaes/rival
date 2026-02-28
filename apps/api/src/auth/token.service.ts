import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import type { UserRole } from '../contexts/auth/domain/auth.role';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  generateAccessToken(user: {
    id: string;
    email: string;
    role: UserRole;
  }): string {
    return this.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  compareTokenHash(token: string, hash: string): boolean {
    const tokenHash = this.hashToken(token);
    const tokenBuf = Buffer.from(tokenHash, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');
    return crypto.timingSafeEqual(tokenBuf, hashBuf);
  }

  async saveRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });
  }

  async findRefreshToken(tokenHash: string) {
    return this.prisma.refreshToken.findFirst({
      where: { tokenHash },
    });
  }

  async revokeToken(id: string, replacedByHash?: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true, ...(replacedByHash && { replacedByHash }) },
    });
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}
