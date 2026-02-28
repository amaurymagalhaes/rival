import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserUseCase } from '../contexts/auth/application/use-cases/register-user.use-case';
import { LoginUserUseCase } from '../contexts/auth/application/use-cases/login-user.use-case';
import { RefreshSessionUseCase } from '../contexts/auth/application/use-cases/refresh-session.use-case';
import { LogoutSessionUseCase } from '../contexts/auth/application/use-cases/logout-session.use-case';
import { GetCurrentUserUseCase } from '../contexts/auth/application/use-cases/get-current-user.use-case';
import {
  DuplicateEmailRegistrationError,
  InvalidRefreshTokenError,
  InvalidPasswordForLoginError,
  RefreshTokenReuseDetectedError,
  UserNotFoundForSessionError,
  UserNotFoundForLoginError,
} from '../contexts/auth/domain/auth.errors';

@Injectable()
export class AuthService {
  constructor(
    @InjectPinoLogger(AuthService.name)
    private readonly logger: PinoLogger,
    private readonly registerUserUseCase: RegisterUserUseCase,
    private readonly loginUserUseCase: LoginUserUseCase,
    private readonly refreshSessionUseCase: RefreshSessionUseCase,
    private readonly logoutSessionUseCase: LogoutSessionUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const result = await this.registerUserUseCase.execute(dto);
      this.logger.info({ userId: result.user.id }, 'User registered');
      return result;
    } catch (error) {
      if (error instanceof DuplicateEmailRegistrationError) {
        this.logger.warn(
          { email: dto.email },
          'Registration failed: duplicate email',
        );
        throw new ConflictException('Email already exists');
      }
      this.logger.error(
        { err: error, email: dto.email },
        'Registration failed: unexpected error',
      );
      throw error;
    }
  }

  async login(dto: LoginDto) {
    try {
      const result = await this.loginUserUseCase.execute(dto);
      this.logger.info({ userId: result.user.id }, 'User logged in');
      return result;
    } catch (error) {
      if (error instanceof UserNotFoundForLoginError) {
        this.logger.warn({ email: error.email }, 'Login failed: user not found');
        throw new UnauthorizedException('Invalid credentials');
      }
      if (error instanceof InvalidPasswordForLoginError) {
        this.logger.warn({ userId: error.userId }, 'Login failed: invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }
      throw error;
    }
  }

  async refresh(rawRefreshToken: string) {
    try {
      return await this.refreshSessionUseCase.execute(rawRefreshToken);
    } catch (error) {
      if (error instanceof RefreshTokenReuseDetectedError) {
        this.logger.warn(
          { userId: error.userId },
          'Refresh token reuse detected',
        );
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (
        error instanceof InvalidRefreshTokenError ||
        error instanceof UserNotFoundForSessionError
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(rawRefreshToken: string) {
    await this.logoutSessionUseCase.execute(rawRefreshToken);
  }

  async me(userId: string) {
    try {
      return await this.getCurrentUserUseCase.execute(userId);
    } catch (error) {
      if (error instanceof UserNotFoundForSessionError) {
        throw new UnauthorizedException('User not found');
      }
      throw error;
    }
  }
}
