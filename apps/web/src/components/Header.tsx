'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine } from 'lucide-react';
import { logout } from '@/app/actions/logout';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthStatusResponse = {
  authenticated: boolean;
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(() =>
    pathname.startsWith('/dashboard') ? 'authenticated' : 'loading',
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAuthStatus() {
      if (!pathname.startsWith('/dashboard')) {
        setAuthStatus('loading');
      }

      try {
        const res = await fetch('/api/auth/status', {
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          setAuthStatus('unauthenticated');
          return;
        }

        const data = (await res.json()) as AuthStatusResponse;
        setAuthStatus(data.authenticated ? 'authenticated' : 'unauthenticated');
      } catch {
        if (!controller.signal.aborted) {
          setAuthStatus('unauthenticated');
        }
      }
    }

    loadAuthStatus();

    return () => controller.abort();
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/72 backdrop-blur-xl">
      <div className="page-shell py-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/82 px-3 py-2.5 shadow-[0_1px_0_0_rgba(255,255,255,0.85)_inset,0_16px_36px_-28px_rgba(34,56,95,0.65)] sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-lg px-2 py-1.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/12 text-primary">
              <PenLine size={17} aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-[0.01em]">HyperBlog</span>
              <span className="hidden text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground sm:block">
                Editorial Platform
              </span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center justify-end gap-1.5">
            <Link
              href="/feed"
              aria-current={isActivePath(pathname, '/feed') ? 'page' : undefined}
              className={cn(
                'rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium text-muted-foreground transition-[background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 sm:px-3 sm:py-2 sm:text-sm',
                isActivePath(pathname, '/feed')
                  ? 'bg-accent text-foreground'
                  : 'hover:bg-accent/70 hover:text-foreground',
              )}
            >
              Feed
            </Link>

            {authStatus === 'authenticated' ? (
              <>
                <Link
                  href="/dashboard"
                  aria-current={
                    isActivePath(pathname, '/dashboard') ? 'page' : undefined
                  }
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium text-muted-foreground transition-[background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 sm:px-3 sm:py-2 sm:text-sm',
                    isActivePath(pathname, '/dashboard')
                      ? 'bg-accent text-foreground'
                      : 'hover:bg-accent/70 hover:text-foreground',
                  )}
                >
                  Dashboard
                </Link>
                <form action={logout}>
                  <Button
                    type="submit"
                    size="xs"
                    variant="outline"
                    className="sm:h-8 sm:px-3 sm:text-sm"
                  >
                    Logout
                  </Button>
                </form>
              </>
            ) : authStatus === 'unauthenticated' ? (
              <>
                <Link
                  href="/login"
                  aria-current={isActivePath(pathname, '/login') ? 'page' : undefined}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[0.82rem] font-medium text-muted-foreground transition-[background-color,color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25 sm:px-3 sm:py-2 sm:text-sm',
                    isActivePath(pathname, '/login')
                      ? 'bg-accent text-foreground'
                      : 'hover:bg-accent/70 hover:text-foreground',
                  )}
                >
                  Login
                </Link>
                <Button asChild size="xs" className="sm:h-8 sm:px-3 sm:text-sm">
                  <Link href="/register">Register</Link>
                </Button>
              </>
            ) : (
              <>
                <div className="h-9 w-[4.5rem] animate-pulse rounded-lg bg-muted" />
                <div className="h-9 w-[5.5rem] animate-pulse rounded-lg bg-muted" />
              </>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
