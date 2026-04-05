import { Suspense } from 'react';

import { AuthForm } from '@/components/auth-form';

function AuthFormFallback() {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/50 bg-white/80 p-8 shadow-[0_24px_80px_rgba(21,28,38,0.14)] backdrop-blur">
      <div className="space-y-3">
        <div className="h-6 w-32 rounded-full bg-slate-200" />
        <div className="h-10 w-56 rounded-xl bg-slate-200" />
        <div className="h-5 w-full rounded-xl bg-slate-100" />
      </div>
      <div className="mt-8 space-y-4">
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-12 rounded-2xl bg-slate-100" />
        <div className="h-12 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_28%),linear-gradient(160deg,#f8fafc_0%,#fff7ed_100%)] px-6 py-12">
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900 shadow-sm">
            SITE SCOPE
          </p>
          <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-slate-950">
            Analyze your Site Performance
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            An authenticated SEO audit platform that analyzes any website with
            PageSpeed Insights, on-page SEO checks, report history, PDF export,
            and Cloudinary-powered user profiles
          </p>
        </section>

        <Suspense fallback={<AuthFormFallback />}>
          <AuthForm mode="login" />
        </Suspense>
      </div>
    </main>
  );
}
