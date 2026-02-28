import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { USER_ROLES } from '../contexts/auth/domain/auth.role';

@Injectable()
export class AdminRouteMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice(7);
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException();
    }

    if (payload.role !== USER_ROLES.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    next();
  }
}
