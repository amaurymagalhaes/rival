import { AllExceptionsFilter } from './http-exception.filter';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: { error: jest.Mock; warn: jest.Mock };
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { url: string; method: string; user?: { id: string } };
  let mockHost: any;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = {
      url: '/test',
      method: 'GET',
    };
    mockHost = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    };

    filter = new AllExceptionsFilter(mockLogger as any);
  });

  it('should log 5xx errors with logger.error', () => {
    const error = new InternalServerErrorException('DB down');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        err: error,
        statusCode: 500,
        method: 'GET',
        url: '/test',
      }),
      'Unhandled server error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should log 4xx errors with logger.warn', () => {
    const error = new NotFoundException('Blog not found');
    filter.catch(error, mockHost);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        method: 'GET',
        url: '/test',
      }),
      'Client error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(404);
  });

  it('should treat unknown errors as 500', () => {
    const error = new Error('Something unexpected');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
      'Unhandled server error',
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
  });

  it('should include userId when available', () => {
    mockRequest.user = { id: 'user-123' };
    const error = new InternalServerErrorException('fail');
    filter.catch(error, mockHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-123' }),
      'Unhandled server error',
    );
  });

  it('should include path and timestamp in response body', () => {
    const error = new NotFoundException('Not found');
    filter.catch(error, mockHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      }),
    );
  });
});
