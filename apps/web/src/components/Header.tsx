import Link from 'next/link';
import { getCurrentUser } from '@/app/actions/get-current-user';
import { logout } from '@/app/actions/logout';
import { Button } from '@/components/ui/button';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold">
          Rival
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/feed">
            <Button variant="ghost" size="sm">
              Feed
            </Button>
          </Link>
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  Dashboard
                </Button>
              </Link>
              <form action={logout}>
                <Button variant="outline" size="sm" type="submit">
                  Logout
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
