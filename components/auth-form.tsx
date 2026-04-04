'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { AuthCard } from '@/components/auth-card';
import { useAuth } from '@/components/auth-provider';

function OAuthButtons() {
  const { loginWithProvider } = useAuth();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => loginWithProvider('google')}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
      >
        Continue with Google
      </button>
      <button
        type="button"
        onClick={() => loginWithProvider('github')}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 transition hover:border-amber-300 hover:bg-amber-50"
      >
        Continue with GitHub
      </button>
    </div>
  );
}

type Mode = 'login' | 'signup';

const INITIAL_FIELDS = {
  name: '',
  email: '',
  password: '',
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup } = useAuth();
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const oauthError = searchParams.get('error');
  const oauthMessage = useMemo(() => {
    if (oauthError === 'oauth_failed') {
      return 'OAuth login was not completed. Please try again.';
    }

    return null;
  }, [oauthError]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login({
          email: fields.email.trim(),
          password: fields.password,
        });
        router.push('/');
        router.refresh();
        return;
      }

      await signup({
        name: fields.name.trim(),
        email: fields.email.trim(),
        password: fields.password,
      });
      router.push('/login?registered=1');
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={mode === 'login' ? 'Welcome back' : 'Create your account'}
      subtitle={
        mode === 'login'
          ? 'Sign in with your email and password or use one of the OAuth providers below.'
          : 'Create an account with email and password, or jump in with Google or GitHub.'
      }
      alternateHref={mode === 'login' ? '/signup' : '/login'}
      alternateLabel={mode === 'login' ? 'Create an account' : 'Log in'}
      alternateText={
        mode === 'login' ? "Don't have an account?" : 'Already have an account?'
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              required
              value={fields.name}
              onChange={(event) =>
                setFields((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              placeholder="Alicia Rivera"
              type="text"
            />
          </label>
        ) : null}

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            required
            value={fields.email}
            onChange={(event) =>
              setFields((current) => ({ ...current, email: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            placeholder="you@example.com"
            type="email"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            required
            minLength={8}
            value={fields.password}
            onChange={(event) =>
              setFields((current) => ({ ...current, password: event.target.value }))
            }
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
            placeholder={mode === 'login' ? 'Enter your password' : 'At least 8 characters'}
            type="password"
          />
        </label>

        {searchParams.get('registered') === '1' && mode === 'login' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Account created successfully. You can log in now.
          </div>
        ) : null}

        {oauthMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {oauthMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? mode === 'login'
              ? 'Signing in...'
              : 'Creating account...'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        Or continue with
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <OAuthButtons />

      <div className="mt-6 text-xs leading-5 text-slate-500">
        Protected areas redirect automatically. JWT tokens stay in HTTP-only cookies
        so they are not exposed to client-side JavaScript.
      </div>

      {mode === 'login' ? null : (
        <p className="mt-4 text-xs text-slate-500">
          By creating an account, you agree to your app&apos;s terms and privacy
          settings.
        </p>
      )}

      <div className="mt-5 text-xs text-slate-500">
        OAuth callback errors will return you here automatically.
      </div>

      <div className="mt-6 text-sm text-slate-500">
        Need a quick switch?{' '}
        <Link href={mode === 'login' ? '/signup' : '/login'} className="underline">
          {mode === 'login' ? 'Sign up instead' : 'Log in instead'}
        </Link>
      </div>
    </AuthCard>
  );
}
