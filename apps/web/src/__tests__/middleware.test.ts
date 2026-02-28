import { NextRequest, NextResponse } from 'next/server';
import { proxy } from '@/proxy';

jest.mock('next/server', () => {
  const redirect = jest.fn().mockReturnValue({ type: 'redirect' });
  const next = jest.fn().mockReturnValue({ type: 'next' });
  return {
    NextRequest: jest.fn(),
    NextResponse: { redirect, next },
  };
});

describe('proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /login when neither token nor refreshToken cookie exists', () => {
    const request = {
      cookies: { get: jest.fn().mockReturnValue(undefined) },
      url: 'http://localhost:3000/dashboard',
    } as unknown as NextRequest;

    proxy(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ href: 'http://localhost:3000/login' }),
    );
  });

  it('allows access when only refreshToken cookie exists (access token expired)', () => {
    const request = {
      cookies: {
        get: jest.fn((name: string) =>
          name === 'refreshToken' ? { value: 'rt-value' } : undefined,
        ),
      },
      url: 'http://localhost:3000/dashboard',
    } as unknown as NextRequest;

    proxy(request);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });

  it('allows access when token cookie exists', () => {
    const request = {
      cookies: {
        get: jest.fn((name: string) =>
          name === 'token' ? { value: 'jwt-value' } : undefined,
        ),
      },
      url: 'http://localhost:3000/dashboard',
    } as unknown as NextRequest;

    proxy(request);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(NextResponse.redirect).not.toHaveBeenCalled();
  });
});
