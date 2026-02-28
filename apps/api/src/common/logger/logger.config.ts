import type { Params } from 'nestjs-pino';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const loggerConfig: Params = {
  pinoHttp: {
    // --- Log Level ---
    level: isTest ? 'silent' : isProduction ? 'info' : 'debug',

    // --- Request ID ---
    genReqId: (req, res) => {
      const existingId = req.headers['x-request-id'];
      if (existingId) {
        res.setHeader('x-request-id', existingId);
        return existingId as string;
      }
      // pino-http generates a default reqId (incrementing integer);
      // we override with crypto.randomUUID() for distributed tracing.
      const id = crypto.randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },

    // --- Sensitive Data Redaction ---
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.passwordHash',
        'req.body.token',
        'req.body.accessToken',
        'req.body.refreshToken',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },

    // --- Custom Serializers ---
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        // Omit headers (already logged by pino-http, redaction handles auth)
        // Omit body (logged selectively by services when needed)
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
      err: (err) => ({
        type: err.constructor?.name || 'Error',
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        code: (err as any).code,
        statusCode: (err as any).statusCode || (err as any).status,
      }),
    },

    // --- Custom Log Properties ---
    customProps: (req: any) => ({
      // Attach userId from JWT (populated by Passport after guard runs)
      userId: req.user?.id,
      context: 'HTTP',
    }),

    // --- Auto-Logging Configuration ---
    autoLogging: {
      // Skip health check noise
      ignore: (req) => req.url === '/health',
    },

    // --- Transport (pretty print in dev) ---
    ...(isProduction
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: false,
              translateTime: 'SYS:HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          },
        }),
  },
};
