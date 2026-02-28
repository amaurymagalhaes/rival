describe('loggerConfig', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.resetModules();
  });

  it('should set level to silent in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('silent');
  });

  it('should set level to info in production', async () => {
    process.env.NODE_ENV = 'production';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('info');
  });

  it('should set level to debug in development', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).level).toBe('debug');
  });

  it('should include pino-pretty transport in non-production', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).transport.target).toBe('pino-pretty');
  });

  it('should NOT include transport in production', async () => {
    process.env.NODE_ENV = 'production';
    const { loggerConfig } = await import('./logger.config');
    expect((loggerConfig.pinoHttp as any).transport).toBeUndefined();
  });

  it('should redact authorization header and password fields', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const redactPaths = (loggerConfig.pinoHttp as any).redact.paths;
    expect(redactPaths).toContain('req.headers.authorization');
    expect(redactPaths).toContain('req.body.password');
    expect(redactPaths).toContain('req.body.accessToken');
  });

  it('should generate UUID request IDs', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const genReqId = (loggerConfig.pinoHttp as any).genReqId;
    const mockRes = { setHeader: jest.fn() };
    const id = genReqId({ headers: {} }, mockRes);
    // UUID v4 format
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('x-request-id', id);
  });

  it('should reuse existing X-Request-Id header', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const genReqId = (loggerConfig.pinoHttp as any).genReqId;
    const mockRes = { setHeader: jest.fn() };
    const existingId = 'upstream-trace-id-123';
    const id = genReqId({ headers: { 'x-request-id': existingId } }, mockRes);
    expect(id).toBe(existingId);
  });

  it('should skip health check from auto-logging', async () => {
    process.env.NODE_ENV = 'development';
    const { loggerConfig } = await import('./logger.config');
    const ignore = (loggerConfig.pinoHttp as any).autoLogging.ignore;
    expect(ignore({ url: '/health' })).toBe(true);
    expect(ignore({ url: '/auth/login' })).toBe(false);
  });
});
