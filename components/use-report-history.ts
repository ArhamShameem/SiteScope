'use client';

import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { AnalysisReport, SavedReport } from '@/lib/types';

export function useReportHistory(enabled: boolean) {
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyAction, setHistoryAction] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
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
  }, [enabled]);

  async function deleteHistoryItem(historyId: string) {
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
    } finally {
      setHistoryAction(null);
    }
  }

  async function deleteAllHistory() {
    setHistoryAction('all');

    try {
      await apiFetch('/api/analysis/history', {
        method: 'DELETE',
      });

      setHistory([]);
      setReport(null);
    } finally {
      setHistoryAction(null);
    }
  }

  function prependHistoryItem(item: SavedReport) {
    setHistory((current) => [item, ...current]);
  }

  return {
    history,
    report,
    setReport,
    setHistory,
    isHistoryLoading,
    historyAction,
    deleteHistoryItem,
    deleteAllHistory,
    prependHistoryItem,
  };
}
