import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    const errorBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ...(typeof errorResponse === 'string'
        ? { message: errorResponse }
        : (errorResponse as object)),
    };

    // Log the error with full context
    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          statusCode: status,
          method: request.method,
          url: request.url,
          userId: (request as any).user?.id,
        },
        'Unhandled server error',
      );
    } else if (status >= 400) {
      this.logger.warn(
        {
          statusCode: status,
          method: request.method,
          url: request.url,
          errorMessage:
            typeof errorResponse === 'string'
              ? errorResponse
              : (errorResponse as any).message,
        },
        'Client error',
      );
    }

    response.status(status).json(errorBody);
  }
}
