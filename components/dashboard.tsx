'use client';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import type { AnalysisReport, SavedReport, User } from '@/lib/types';

function validateWebsiteUrl(value: string) {
  if (!value.trim()) {
    return 'Enter a website URL to analyze.';
  }

  try {
    const candidate = value.startsWith('http') ? value : `https://${value}`;
    const parsed = new URL(candidate);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Only HTTP and HTTPS URLs are supported.';
    }

    return null;
  } catch {
    return 'Enter a valid URL, for example `https://example.com`.';
  }
}

function formatMilliseconds(value: number | null) {
  if (value == null) {
    return 'N/A';
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${Math.round(value)} ms`;
}

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

function scorePalette(score: number) {
  if (score >= 90) {
    return {
      ring: '#22c55e',
      trail: '#dcfce7',
      text: 'text-emerald-700',
    };
  }

  if (score >= 70) {
    return {
      ring: '#f59e0b',
      trail: '#fef3c7',
      text: 'text-amber-700',
    };
  }

  return {
    ring: '#e11d48',
    trail: '#ffe4e6',
    text: 'text-rose-700',
  };
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function CircularScore({
  label,
  score,
  size = 132,
}: {
  label: string;
  score: number;
  size?: number;
}) {
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const palette = scorePalette(score);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="-rotate-90" width={size} height={size} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette.trail}
            strokeWidth="10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette.ring}
            strokeLinecap="round"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-semibold ${palette.text}`}>{score}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            score
          </span>
        </div>
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </span>
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

export function Dashboard() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const { user, isLoading, logout, updateUser } = useAuth();
  const [url, setUrl] = useState('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyAction, setHistoryAction] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const summaryCards = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        label: 'Load time',
        value: formatMilliseconds(report.overview.loadTimeMs),
        hint: 'Estimated page interactivity or speed index timing.',
      },
      {
        label: 'Page size',
        value: formatBytes(report.overview.pageSizeBytes),
        hint: 'Raw HTML payload size fetched during the audit.',
      },
      {
        label: 'Missing alt text',
        value: `${report.overview.imagesWithoutAlt}`,
        hint: 'Images missing meaningful alternative text.',
      },
      {
        label: 'Saved reports',
        value: `${history.length}`,
        hint: 'Stored in your personal report history.',
      },
    ];
  }, [history.length, report]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    async function loadHistory() {
      setIsHistoryLoading(true);

      try {
        const response = await apiFetch<{ history: SavedReport[] }>('/api/analysis/history', {
          method: 'GET',
        });
        setHistory(response.history);
        setReport((current) => current || response.history[0]?.report || null);
      } catch {
        // Keep the page usable even if history loading fails.
      } finally {
        setIsHistoryLoading(false);
      }
    }

    void loadHistory();
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)] px-6">
        <div className="rounded-3xl border border-white/60 bg-white/80 px-8 py-6 text-sm text-slate-700 shadow-[0_24px_80px_rgba(21,28,38,0.14)] backdrop-blur">
          Checking your session...
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateWebsiteUrl(url);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ report: AnalysisReport; savedReport: SavedReport }>(
        '/api/analysis',
        {
          method: 'POST',
          body: JSON.stringify({ url }),
        }
      );

      setReport(response.report);
      setHistory((current) => [response.savedReport, ...current]);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Analysis failed. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteHistoryItem(historyId: string) {
    setHistoryAction(historyId);

    try {
      await apiFetch(`/api/analysis/history/${historyId}`, {
        method: 'DELETE',
      });

      setHistory((current) => {
        const deletedEntry = current.find((item) => item.id === historyId);
        const next = current.filter((item) => item.id !== historyId);

        if (
          report &&
          deletedEntry &&
          deletedEntry.report.url === report.url &&
          deletedEntry.report.scannedAt === report.scannedAt
        ) {
          setReport(next[0]?.report || null);
        }

        return next;
      });
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Unable to delete that history entry.'
      );
    } finally {
      setHistoryAction(null);
    }
  }

  async function handleDeleteAllHistory() {
    setHistoryAction('all');

    try {
      await apiFetch('/api/analysis/history', {
        method: 'DELETE',
      });
      setHistory([]);
      setReport(null);
    } catch (deletionError) {
      setError(
        deletionError instanceof Error
          ? deletionError.message
          : 'Unable to clear history.'
      );
    } finally {
      setHistoryAction(null);
    }
  }

  async function handleExportPdf() {
    if (!reportRef.current || !report) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#fffdf8',
      });

      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth - 20;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      let heightLeft = imageHeight;
      let position = 10;

      pdf.addImage(image, 'PNG', 10, position, imageWidth, imageHeight);
      heightLeft -= pageHeight - 20;

      while (heightLeft > 0) {
        position = heightLeft - imageHeight + 10;
        pdf.addPage();
        pdf.addImage(image, 'PNG', 10, position, imageWidth, imageHeight);
        heightLeft -= pageHeight - 20;
      }

      const hostname = new URL(report.url).hostname.replace(/\./g, '-');
      pdf.save(`seo-report-${hostname}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);
    setIsUploadingAvatar(true);
    setError(null);

    try {
      const response = await apiFetch<{ user: User }>('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      updateUser(response.user);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : 'Unable to upload profile image.'
      );
    } finally {
      setIsUploadingAvatar(false);
      event.target.value = '';
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.18),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[2rem] border border-white/60 bg-slate-950 px-8 py-8 text-white shadow-[0_28px_90px_rgba(15,23,42,0.34)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                SEO analysis dashboard
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Analyze any website and turn PageSpeed plus on-page SEO signals into
                one clean report.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Submit a URL to inspect performance, Core Web Vitals, title/meta
                coverage, heading structure, image alt text, page size, and
                prioritized optimization suggestions.
              </p>
            </div>

            <div className="relative self-start">
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/8 shadow-[0_12px_30px_rgba(15,23,42,0.22)] transition hover:bg-white/12"
                aria-label="Open profile menu"
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={user.name}
                    width={56}
                    height={56}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                    {getInitials(user.name)}
                  </div>
                )}
              </button>

              {isProfileOpen ? (
                <div className="absolute right-0 top-[calc(100%+1rem)] w-88 rounded-[1.75rem] border border-white/15 bg-white z-99999 p-5 text-black shadow-[0_28px_90px_rgba(15,23,42,0.46)] backdrop-blur">
                  <div className="flex items-center gap-4">
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.name}
                        width={72}
                        height={72}
                        className="h-18 w-18 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-semibold text-white">
                        {getInitials(user.name)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Profile</p>
                      <h3 className="mt-2 truncate text-xl font-semibold text-white">
                        {user.name}
                      </h3>
                      <p className="mt-1 truncate text-sm text-slate-300">{user.email}</p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {user.provider} account
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-200">
                        Profile image
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleAvatarUpload(event)}
                        className="block w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200"
                      />
                    </label>

                    <p className="text-xs leading-5 text-slate-400">
                      Upload a square image for the best avatar result. Files are stored
                      in Cloudinary.
                    </p>

                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
                      {isUploadingAvatar ? 'Uploading avatar...' : 'Avatar upload ready'}
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        router.replace('/login');
                        router.refresh();
                      }}
                      className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="grid gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                New analysis
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Run a website audit
              </h2>
            </div>

            <form className="space-y-4" onSubmit={handleAnalyze}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">Website URL</span>
                <input
                  type="text"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Analyzing...' : 'Analyze'}
                </button>
                <button
                  type="button"
                  onClick={() => setUrl('https://www.example.com')}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50"
                >
                  Use example URL
                </button>
                <button
                  type="button"
                  disabled={!report || isExportingPdf}
                  onClick={() => void handleExportPdf()}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isExportingPdf ? 'Preparing PDF...' : 'Download PDF'}
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  History
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Recent reports
                </h2>
              </div>

              <button
                type="button"
                disabled={history.length === 0 || historyAction === 'all'}
                onClick={() => void handleDeleteAllHistory()}
                className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {historyAction === 'all' ? 'Deleting...' : 'Delete all'}
              </button>
            </div>

            <div className="mt-6 space-y-3">
              {isHistoryLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  Loading saved reports...
                </div>
              ) : null}

              {!isHistoryLoading && history.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-600">
                  No saved reports yet. Run your first analysis and it will appear here.
                </div>
              ) : null}

              {history.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setReport(item.report);
                        setUrl(item.url);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {item.url}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={historyAction === item.id}
                      onClick={() => void handleDeleteHistoryItem(item.id)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {historyAction === item.id ? 'Deleting' : 'Delete'}
                    </button>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <CircularScore label="Performance" score={item.report.performanceScore} size={96} />
                    <CircularScore label="SEO" score={item.report.seoScore} size={96} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                hint={card.hint}
              />
            ))}
          </div>
        </section>

        {report ? (
          <div ref={reportRef} className="space-y-6">
            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Latest report
                  </p>
                  <h2 className="mt-2 break-all text-2xl font-semibold text-slate-950">
                    {report.url}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Scanned {new Date(report.scannedAt).toLocaleString()}
                  </p>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <CircularScore label="Performance" score={report.performanceScore} />
                  <CircularScore label="SEO" score={report.seoScore} />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <MetricCard
                    label="LCP"
                    value={formatMilliseconds(report.coreWebVitals.lcp)}
                    hint="Largest Contentful Paint"
                  />
                  <MetricCard
                    label="FCP"
                    value={formatMilliseconds(report.coreWebVitals.fcp)}
                    hint="First Contentful Paint"
                  />
                  <MetricCard
                    label="CLS"
                    value={report.coreWebVitals.cls?.toFixed(2) || 'N/A'}
                    hint="Cumulative Layout Shift"
                  />
                  <MetricCard
                    label="INP"
                    value={formatMilliseconds(report.coreWebVitals.inp)}
                    hint="Interaction to Next Paint"
                  />
                  <MetricCard
                    label="TTFB"
                    value={formatMilliseconds(report.coreWebVitals.ttfb)}
                    hint="Time to First Byte"
                  />
                  <MetricCard
                    label="SEO blend"
                    value={`${report.pageSpeedSeoScore}/${report.contentSeoScore}`}
                    hint="Lighthouse SEO vs content SEO scoring."
                  />
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Content signals
                </p>
                <div className="mt-5 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Title tag</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {report.overview.title || 'No title tag detected.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Meta description</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {report.overview.metaDescription || 'No meta description detected.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Headings</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      H1: {report.overview.headingStructure.h1.length} | H2:{' '}
                      {report.overview.headingStructure.h2.length}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Issues
                </p>
                <ul className="mt-5 space-y-3">
                  {(report.issues.length
                    ? report.issues
                    : ['No major SEO issues were detected in the implemented checks.']).map(
                    (issue) => (
                      <li
                        key={issue}
                        className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
                      >
                        {issue}
                      </li>
                    )
                  )}
                </ul>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Suggestions
                </p>
                <ul className="mt-5 space-y-3">
                  {(report.suggestions.length
                    ? report.suggestions
                    : ['This page looks healthy in the current rule set. Keep monitoring Core Web Vitals over time.']).map(
                    (suggestion) => (
                      <li
                        key={suggestion}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                      >
                        {suggestion}
                      </li>
                    )
                  )}
                </ul>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Audit checks
              </p>
              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {report.audits.map((audit) => (
                  <div
                    key={audit.label}
                    className={`rounded-[1.5rem] border p-5 ${
                      audit.status === 'pass'
                        ? 'border-emerald-200 bg-emerald-50'
                        : audit.status === 'warn'
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {audit.label}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-800">{audit.details}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
