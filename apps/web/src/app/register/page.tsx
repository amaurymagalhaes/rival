import { RegisterForm } from '@/components/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="page-shell py-10 sm:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="surface-panel relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute -left-16 -bottom-12 h-48 w-48 rounded-full bg-[oklch(0.9_0.08_228/58%)] blur-3xl" />
          <p className="kicker">Create Account</p>
          <h1 className="display-title mt-2 text-4xl font-semibold sm:text-5xl">
            Register
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            Start publishing in minutes. Build your profile, draft your first
            article, and share it instantly.
          </p>
          <div className="mt-8 space-y-3">
            <div className="rounded-xl border border-border/75 bg-white/72 p-4">
              <p className="text-sm font-semibold">No setup required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Jump right into writing with clean defaults.
              </p>
            </div>
            <div className="rounded-xl border border-border/75 bg-white/72 p-4">
              <p className="text-sm font-semibold">Built for discoverability</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Public feed + SEO analysis help your work get found.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center justify-center">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
