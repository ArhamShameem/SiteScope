import Link from 'next/link';

export function AuthCard({
  title,
  subtitle,
  alternateHref,
  alternateLabel,
  alternateText,
  children,
}: {
  title: string;
  subtitle: string;
  alternateHref: string;
  alternateLabel: string;
  alternateText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md rounded-[2rem] border border-white/50 bg-white/80 p-8 shadow-[0_24px_80px_rgba(21,28,38,0.14)] backdrop-blur">
      <div className="mb-8 space-y-3">
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-900">
          Secure access
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>

      {children}

      <p className="mt-8 text-sm text-slate-600">
        {alternateText}{' '}
        <Link
          href={alternateHref}
          className="font-semibold text-slate-950 transition hover:text-amber-700"
        >
          {alternateLabel}
        </Link>
      </p>
    </div>
  );
}
