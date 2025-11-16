"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TimingAnalysisPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/dev"
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>戻る</span>
            </Link>
            <h1 className="text-2xl font-bold text-slate-100">
              📊 売買タイミング最適化分析
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <iframe
            src="/api/timing-analysis"
            className="w-full h-full border-0"
            title="Timing Analysis Report"
          />
        </div>
      </div>
    </div>
  );
}
