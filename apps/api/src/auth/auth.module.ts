import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { TokenService } from './token.service';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaAuthUserRepository } from '../contexts/auth/infrastructure/prisma-auth-user.repository';
import { TokenServiceAuthTokenAdapter } from '../contexts/auth/infrastructure/token-service-auth-token.adapter';
import type { AuthTokenPort } from '../contexts/auth/domain/auth-token.port';
import type { AuthUserRepository } from '../contexts/auth/domain/auth-user.repository';
import {
  AUTH_TOKEN_PORT,
  AUTH_USER_REPOSITORY,
} from '../contexts/auth/domain/auth.tokens';
import { RegisterUserUseCase } from '../contexts/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../contexts/auth/application/use-cases/login-user.use-case';
import { RefreshSessionUseCase } from '../contexts/auth/application/use-cases/refresh-session.use-case';
import { LogoutSessionUseCase } from '../contexts/auth/application/use-cases/logout-session.use-case';
import { GetCurrentUserUseCase } from '../contexts/auth/application/use-cases/get-current-user.use-case';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    {
      provide: AUTH_USER_REPOSITORY,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) => new PrismaAuthUserRepository(prisma),
    },
    {
      provide: AUTH_TOKEN_PORT,
      inject: [TokenService],
      useFactory: (tokenService: TokenService) =>
        new TokenServiceAuthTokenAdapter(tokenService),
    },
    {
      provide: RegisterUserUseCase,
      inject: [AUTH_USER_REPOSITORY, AUTH_TOKEN_PORT],
      useFactory: (
        users: AuthUserRepository,
        tokens: AuthTokenPort,
      ) => new RegisterUserUseCase(users, tokens),
    },
    {
      provide: LoginUserUseCase,
      inject: [AUTH_USER_REPOSITORY, AUTH_TOKEN_PORT],
      useFactory: (
        users: AuthUserRepository,
        tokens: AuthTokenPort,
      ) => new LoginUserUseCase(users, tokens),
    },
    {
      provide: RefreshSessionUseCase,
      inject: [AUTH_USER_REPOSITORY, AUTH_TOKEN_PORT],
      useFactory: (
        users: AuthUserRepository,
        tokens: AuthTokenPort,
      ) => new RefreshSessionUseCase(users, tokens),
    },
    {
      provide: LogoutSessionUseCase,
      inject: [AUTH_TOKEN_PORT],
      useFactory: (tokens: AuthTokenPort) =>
        new LogoutSessionUseCase(tokens),
    },
    {
      provide: GetCurrentUserUseCase,
      inject: [AUTH_USER_REPOSITORY],
      useFactory: (users: AuthUserRepository) =>
        new GetCurrentUserUseCase(users),
    },
  ],
  exports: [TokenService, JwtModule],
})
export class AuthModule {}
