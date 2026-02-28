import { LoginForm } from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-[oklch(0.9_0.08_58/55%)] blur-3xl" />
          <p className="kicker">Welcome Back</p>
          <h1 className="display-title mt-2 text-4xl font-semibold sm:text-5xl">
            Login
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Continue where you left off. Your dashboard, drafts, and published
            posts are waiting.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border/75 bg-white/72 p-4">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Draft Workflow
              </p>
              <p className="mt-1 text-sm font-semibold">Edit first, publish when ready</p>
            </div>
            <div className="rounded-xl border border-border/75 bg-white/72 p-4">
              <p className="text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Built-In SEO
              </p>
              <p className="mt-1 text-sm font-semibold">Summaries and metadata included</p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
