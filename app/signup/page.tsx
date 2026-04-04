import { AuthForm } from '@/components/auth-form';

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(160deg,#eef2ff_0%,#fff7ed_100%)] px-6 py-12">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-900 shadow-sm">
            Secure onboarding
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-slate-950">
            Create an account once and support email, Google, or GitHub sign-in.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            New users can register with email and password, while returning users can
            continue with OAuth providers and land on the same protected home screen.
          </p>
        </section>

        <AuthForm mode="signup" />
      </div>
    </main>
  );
}
