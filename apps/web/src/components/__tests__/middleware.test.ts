import { NextRequest, NextResponse } from 'next/server';
import { middleware } from '@/middleware';

jest.mock('next/server', () => {
  const redirect = jest.fn().mockReturnValue({ type: 'redirect' });
  const next = jest.fn().mockReturnValue({ type: 'next' });
  return {
    NextRequest: jest.fn(),
    NextResponse: { redirect, next },
  };
});

describe('middleware', () => {
  it('redirects to /login when no token cookie exists', () => {
    const request = {
      cookies: { get: jest.fn().mockReturnValue(undefined) },
      url: 'http://localhost:3000/dashboard',
    } as unknown as NextRequest;

    middleware(request);

    expect(NextResponse.redirect).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/login' }),
    );
  });
});
