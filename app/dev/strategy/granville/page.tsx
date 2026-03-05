"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { DevNavLinks } from "@/components/dev";
import { buildApiUrl } from "@/lib/api-base";

type Report = {
  filename: string;
  chapter: string;
  title: string;
  size_bytes: number;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function chapterLabel(chapter: string): string {
  const map: Record<string, string> = {
    "01_data_quality": "Ch.1 Data Quality",
    "02_mae_mfe_raw": "Ch.2 MAE/MFE Raw",
    "03_sl_optimization": "Ch.3 SL Optimization",
    "04_exit_strategy": "Ch.4 Exit Strategy",
  };
  return map[chapter] ?? chapter;
}

export default function StrategyGranvillePage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFilename, setExpandedFilename] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildApiUrl("/api/dev/strategy/granville"));
        if (!res.ok) throw new Error("レポート一覧の取得に失敗しました");
        const data = await res.json();
        setReports(data.reports ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "エラー");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleExpand = (filename: string) => {
    setExpandedFilename((prev) => (prev === filename ? null : filename));
  };

  // Group by chapter
  const grouped = reports.reduce<Record<string, Report[]>>((acc, r) => {
    (acc[r.chapter] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold tracking-tight">
            Strategy Verification — Granville 8 Rules
          </h1>
          <DevNavLinks />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            読み込み中...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && reports.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            レポートがありません
          </div>
        )}

        {!loading &&
          !error &&
          Object.entries(grouped).map(([chapter, items]) => (
            <div key={chapter} className="mb-4">
              <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
                {chapterLabel(chapter)}
              </h2>
              <div className="space-y-2">
                {items.map((r) => {
                  const isExpanded = expandedFilename === r.filename;
                  return (
                    <div key={r.filename}>
                      <div
                        className={`flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors cursor-pointer ${
                          isExpanded
                            ? "border-primary/40 bg-accent/30"
                            : "border-border hover:bg-accent/50"
                        }`}
                        onClick={() => toggleExpand(r.filename)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {r.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatBytes(r.size_bytes)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-1 rounded-lg overflow-hidden">
                          <iframe
                            src={buildApiUrl(
                              `/api/dev/strategy/granville/${r.filename}/view`
                            )}
                            className="w-full border-0"
                            style={{ height: "85vh" }}
                            title={r.title}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
