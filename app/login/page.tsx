import { AuthForm } from '@/components/auth-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(160deg,#f8fafc_0%,#fff7ed_100%)] px-6 py-12">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900 shadow-sm">
            Full-stack authentication
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-slate-950">
            JWT cookies on the backend. Clean auth flows on the frontend.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            This starter combines a Next.js App Router frontend with an Express API,
            MongoDB user storage, Passport OAuth strategies, and route protection on
            both sides.
          </p>
        </section>

        <AuthForm mode="login" />
      </div>
    </main>
  );
}
