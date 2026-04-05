'use client';

import jsPDF from 'jspdf';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/components/auth-provider';
import {
  CircularScore,
  MetricCard,
  formatBytes,
  formatMilliseconds,
} from '@/components/report-ui';
import { useReportHistory } from '@/components/use-report-history';
import { apiFetch } from '@/lib/api';
import type { AnalysisReport, SavedReport } from '@/lib/types';

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

function createPdfWriter(pdf: jsPDF) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = 20;

  function ensureSpace(heightNeeded: number) {
    if (cursorY + heightNeeded <= pageHeight - margin) {
      return;
    }

    pdf.addPage();
    cursorY = 20;
  }

  function writeHeading(text: string) {
    ensureSpace(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(15, 23, 42);
    pdf.text(text, margin, cursorY);
    cursorY += 8;
  }

  function writeLabelValue(label: string, value: string) {
    const lines = pdf.splitTextToSize(`${label}: ${value}`, contentWidth);
    ensureSpace(lines.length * 6 + 2);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(51, 65, 85);
    pdf.text(lines, margin, cursorY);
    cursorY += lines.length * 6 + 2;
  }

  function writeList(title: string, items: string[]) {
    writeHeading(title);

    const values = items.length ? items : ['None'];

    for (const item of values) {
      const lines = pdf.splitTextToSize(`• ${item}`, contentWidth);
      ensureSpace(lines.length * 6 + 1);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      pdf.setTextColor(51, 65, 85);
      pdf.text(lines, margin, cursorY);
      cursorY += lines.length * 6 + 1;
    }

    cursorY += 3;
  }

  function addGap(size = 4) {
    cursorY += size;
  }

  return {
    writeHeading,
    writeLabelValue,
    writeList,
    addGap,
  };
}

export function DashboardHome() {
  const router = useRouter();
  const reportRef = useRef<HTMLDivElement | null>(null);
  const { user, isLoading } = useAuth();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const { history, report, setReport, prependHistoryItem } = useReportHistory(
    Boolean(user)
  );

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
      const response = await apiFetch<{
        report: AnalysisReport;
        savedReport: SavedReport;
      }>('/api/analysis', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });

      setReport(response.report);
      prependHistoryItem(response.savedReport);
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

  async function handleExportPdf() {
    if (!report) {
      return;
    }

    setIsExportingPdf(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const writer = createPdfWriter(pdf);

      writer.writeHeading('SEO Analysis Report');
      writer.writeLabelValue('URL', report.url);
      writer.writeLabelValue(
        'Scanned at',
        new Date(report.scannedAt).toLocaleString()
      );
      writer.writeLabelValue('Performance score', `${report.performanceScore}`);
      writer.writeLabelValue('SEO score', `${report.seoScore}`);
      writer.writeLabelValue(
        'SEO blend',
        `${report.pageSpeedSeoScore}/${report.contentSeoScore}`
      );
      writer.addGap();

      writer.writeHeading('Overview');
      writer.writeLabelValue(
        'Load time',
        formatMilliseconds(report.overview.loadTimeMs)
      );
      writer.writeLabelValue(
        'Page size',
        formatBytes(report.overview.pageSizeBytes)
      );
      writer.writeLabelValue('Image count', `${report.overview.imageCount}`);
      writer.writeLabelValue(
        'Missing alt text',
        `${report.overview.imagesWithoutAlt}`
      );
      writer.writeLabelValue(
        'Title tag',
        report.overview.title || 'No title tag detected.'
      );
      writer.writeLabelValue(
        'Meta description',
        report.overview.metaDescription || 'No meta description detected.'
      );
      writer.writeLabelValue(
        'Heading count',
        `H1: ${report.overview.headingStructure.h1.length}`
      );
      writer.writeLabelValue(
        'Heading count',
        `H2: ${report.overview.headingStructure.h2.length}`
      );
      writer.addGap();

      writer.writeHeading('Core Web Vitals');
      writer.writeLabelValue(
        'LCP',
        formatMilliseconds(report.coreWebVitals.lcp)
      );
      writer.writeLabelValue(
        'FCP',
        formatMilliseconds(report.coreWebVitals.fcp)
      );
      writer.writeLabelValue(
        'CLS',
        report.coreWebVitals.cls?.toFixed(2) || 'N/A'
      );
      writer.writeLabelValue(
        'INP',
        formatMilliseconds(report.coreWebVitals.inp)
      );
      writer.writeLabelValue(
        'TTFB',
        formatMilliseconds(report.coreWebVitals.ttfb)
      );
      writer.addGap();

      writer.writeList('Issues', report.issues);
      writer.writeList('Suggestions', report.suggestions);
      writer.writeList(
        'Audit checks',
        report.audits.map(
          (audit) => `${audit.label} (${audit.status}): ${audit.details}`
        )
      );

      const hostname = new URL(report.url).hostname.replace(/\./g, '-');
      pdf.save(`seo-report-${hostname}.pdf`);
    } finally {
      setIsExportingPdf(false);
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
                Analyze any website and turn PageSpeed plus on-page SEO signals
                into one clean report.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300">
                Submit a URL to inspect performance, Core Web Vitals, title/meta
                coverage, heading structure, image alt text, page size, and
                prioritized optimization suggestions.
              </p>
            </div>

            <div className="max-w-sm rounded-[1.75rem] border border-white/15 bg-white/8 p-5 shadow-[0_28px_70px_rgba(2,6,23,0.25)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                Workspace
              </p>
              <p className="mt-3 text-2xl font-semibold text-white">
                {history.length}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                saved reports are available in the history page.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                New analysis
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Paste a website and generate a fresh SEO report.
              </h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Each run stores a copy in your history, so you can revisit
                previous scans without cluttering the dashboard.
              </p>
            </div>

            <button
              type="button"
              disabled={!report || isExportingPdf}
              onClick={() => void handleExportPdf()}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExportingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>
          </div>

          <form
            className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto]"
            onSubmit={handleAnalyze}
          >
            <label className="block">
              <span className="sr-only">Website URL</span>
              <input
                type="text"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com"
                className="w-full rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-4 text-base text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[1.5rem] bg-slate-950 px-6 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Analyzing...' : 'Analyze website'}
            </button>
          </form>

          {error ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {error}
            </div>
          ) : null}
        </section>

        {report ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <MetricCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  hint={card.hint}
                />
              ))}
            </section>

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
                    <CircularScore
                      label="Performance"
                      score={report.performanceScore}
                    />
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
                      <h3 className="text-sm font-semibold text-slate-950">
                        Title tag
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {report.overview.title || 'No title tag detected.'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Meta description
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {report.overview.metaDescription ||
                          'No meta description detected.'}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Headings
                      </h3>
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
                      : [
                          'No major SEO issues were detected in the implemented checks.',
                        ]
                    ).map((issue) => (
                      <li
                        key={issue}
                        className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"
                      >
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Suggestions
                  </p>
                  <ul className="mt-5 space-y-3">
                    {(report.suggestions.length
                      ? report.suggestions
                      : [
                          'This page looks healthy in the current rule set. Keep monitoring Core Web Vitals over time.',
                        ]
                    ).map((suggestion) => (
                      <li
                        key={suggestion}
                        className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900"
                      >
                        {suggestion}
                      </li>
                    ))}
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
                      <p className="mt-3 text-sm leading-6 text-slate-800">
                        {audit.details}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
