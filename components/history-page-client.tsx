'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { HistorySection } from '@/components/history-section';
import { CircularScore, MetricCard, formatBytes, formatMilliseconds } from '@/components/report-ui';
import { useReportHistory } from '@/components/use-report-history';
import { useAuth } from '@/components/auth-provider';

export function HistoryPageClient() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const {
    history,
    report,
    setReport,
    isHistoryLoading,
    historyAction,
    deleteHistoryItem,
    deleteAllHistory,
  } = useReportHistory(Boolean(user));

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),radial-gradient(circle_at_right,_rgba(251,191,36,0.18),_transparent_22%),linear-gradient(180deg,#f8fafc_0%,#fff7ed_100%)] px-6 py-8 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/85 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Saved history
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
            Revisit every report you&apos;ve already scanned.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Open any saved audit, compare the latest scores, and clear old entries when you no
            longer need them.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <HistorySection
            history={history}
            isHistoryLoading={isHistoryLoading}
            historyAction={historyAction}
            onSelect={(item) => setReport(item.report)}
            onDeleteItem={(historyId) => deleteHistoryItem(historyId)}
            onDeleteAll={() => deleteAllHistory()}
            title="History"
            description="Reports"
          />

          <div className="space-y-6">
            {report ? (
              <>
                <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Selected report
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

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Load time"
                    value={formatMilliseconds(report.overview.loadTimeMs)}
                    hint="Estimated page interactivity or speed index timing."
                  />
                  <MetricCard
                    label="Page size"
                    value={formatBytes(report.overview.pageSizeBytes)}
                    hint="Raw HTML payload size fetched during the audit."
                  />
                  <MetricCard
                    label="Missing alt text"
                    value={`${report.overview.imagesWithoutAlt}`}
                    hint="Images missing meaningful alternative text."
                  />
                  <MetricCard
                    label="Saved reports"
                    value={`${history.length}`}
                    hint="Stored in your personal report history."
                  />
                </section>
              </>
            ) : (
              <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white/75 p-8 text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                Select a history item to preview its report details here.
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
