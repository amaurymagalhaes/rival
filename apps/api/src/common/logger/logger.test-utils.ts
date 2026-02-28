import { getLoggerToken } from 'nestjs-pino';

/**
 * Creates a mock PinoLogger provider for testing.
 * Usage: providers: [mockLoggerProvider(MyService.name)]
 */
export function mockLoggerProvider(context: string) {
  return {
    provide: getLoggerToken(context),
    useValue: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      fatal: jest.fn(),
      setContext: jest.fn(),
      assign: jest.fn(),
    },
  };
}
