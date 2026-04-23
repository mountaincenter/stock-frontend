"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { DevNavLinks } from "@/components/dev";
import { buildApiUrl } from "@/lib/api-base";

type ReportType = "market_report" | "results_report";

type Report = {
  filename: string;
  date: string;
  title: string;
  size_bytes: number;
  uploaded_at: string;
  report_type: ReportType;
};

const TAB_LABELS: Record<ReportType, string> = {
  market_report: "市況レポート",
  results_report: "取引結果",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}（${weekdays[d.getDay()]}）`;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFilename, setExpandedFilename] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportType>("market_report");

  const filteredReports = reports.filter((r) => r.report_type === activeTab);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildApiUrl("/api/dev/reports"));
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold tracking-tight">Reports</h1>
          <DevNavLinks />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-border">
          {(Object.keys(TAB_LABELS) as ReportType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = reports.filter((r) => r.report_type === tab).length;
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setExpandedFilename(null);
                }}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  isActive
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAB_LABELS[tab]}
                <span className="ml-1.5 text-xs text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            読み込み中...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredReports.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            レポートがありません
          </div>
        )}

        {/* Report list */}
        {!loading && !error && filteredReports.length > 0 && (
          <div className="space-y-2">
            {filteredReports.map((r) => {
              const isExpanded = expandedFilename === r.filename;
              return (
                <div key={r.filename}>
                  {/* Row */}
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
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(r.date)} &middot; {formatBytes(r.size_bytes)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="mt-1 -mx-3 rounded-lg overflow-hidden">
                      <iframe
                        src={buildApiUrl(`/api/dev/reports/${r.filename}/view`)}
                        className="w-full border-0"
                        style={{ height: "80vh" }}
                        title={r.title}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
