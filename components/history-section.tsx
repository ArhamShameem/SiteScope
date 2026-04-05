'use client';

import { CircularScore } from '@/components/report-ui';
import type { SavedReport } from '@/lib/types';

export function HistorySection({
  history,
  isHistoryLoading,
  historyAction,
  onSelect,
  onDeleteItem,
  onDeleteAll,
  title = 'Recent reports',
  description = 'History',
}: {
  history: SavedReport[];
  isHistoryLoading: boolean;
  historyAction: string | null;
  onSelect: (item: SavedReport) => void;
  onDeleteItem: (historyId: string) => void | Promise<void>;
  onDeleteAll: () => void | Promise<void>;
  title?: string;
  description?: string;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            {description}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">{title}</h2>
        </div>

        <button
          type="button"
          disabled={history.length === 0 || historyAction === 'all'}
          onClick={() => void onDeleteAll()}
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
              <button type="button" onClick={() => onSelect(item)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-slate-950">{item.url}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </p>
              </button>

              <button
                type="button"
                disabled={historyAction === item.id}
                onClick={() => void onDeleteItem(item.id)}
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
    </section>
  );
}
