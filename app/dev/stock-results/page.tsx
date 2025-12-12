'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '../../../src/components/auth/ProtectedRoute';
import { useAuth } from '../../../src/components/auth/AuthProvider';
import { DevNavLinks, FilterButtonGroup } from '../../../components/dev';
import { LogOut, ChevronDown, ChevronRight, Fingerprint, Check } from 'lucide-react';
// WebAuthn APIは動的importで使用（HMR問題回避）

// Types
interface Summary {
  total_profit: number;
  total_count: number;
  win_count: number;
  lose_count: number;
  win_rate: number;
  long_profit: number;
  long_count: number;
  long_win: number;
  long_lose: number;
  long_win_rate: number;
  short_profit: number;
  short_count: number;
  short_win: number;
  short_lose: number;
  short_win_rate: number;
}

interface LossDistribution {
  range: string;
  total: number;
  count: number;
  long: number;
  short: number;
}

interface DailyStat {
  date: string;
  profit: number;
  long_profit: number;
  short_profit: number;
  count: number;
  win_count: number;
  win_rate: number;
  cumulative_profit: number;
  cumulative_long: number;
  cumulative_short: number;
}

interface SummaryResponse {
  summary: Summary;
  daily_stats: DailyStat[];
  loss_distribution: LossDistribution[];
  updated_at: string | null;
}

interface Trade {
  code: string;
  name: string;
  position: string;
  qty: number;
  avg_cost: number;
  avg_price: number;
  profit: number;
  date?: string;
}

interface DailyResult {
  key: string;
  total_profit: number;
  long_profit: number;
  short_profit: number;
  count: number;
  trades: Trade[];
}

interface DailyResponse {
  view: string;
  results: DailyResult[];
}

type ViewType = 'daily' | 'weekly' | 'monthly' | 'bystock';

function StockResultsContent() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [dailyData, setDailyData] = useState<DailyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewType>('daily');
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // パスキー関連（自動チェックなし - 登録時のみ確認）
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [passkeyMessage, setPasskeyMessage] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

  // パスキー登録（クリック時のみ実行）
  async function handleRegisterPasskey() {
    setIsRegisteringPasskey(true);
    setPasskeyMessage(null);
    try {
      const { associateWebAuthnCredential } = await import('aws-amplify/auth');
      await associateWebAuthnCredential();
      setHasPasskey(true);
      setPasskeyMessage('パスキーを登録しました！次回から生体認証でログインできます。');
    } catch (err: unknown) {
      console.error('Passkey registration error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('required scopes') || errorMessage.includes('NotAuthorizedException')) {
        setPasskeyMessage('パスキー登録には「パスキー対応ログイン」での再ログインが必要です。ログアウトして再ログインしてください。');
      } else if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        setHasPasskey(true);
        setPasskeyMessage('パスキーは既に登録されています。');
      } else {
        setPasskeyMessage(`パスキーの登録に失敗しました: ${errorMessage}`);
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API_BASE}/api/dev/stock-results/summary`).then(res => res.json()),
      fetch(`${API_BASE}/api/dev/stock-results/${view === 'bystock' ? 'by-stock' : `daily?view=${view}`}`).then(res => res.json()),
    ])
      .then(([summary, daily]) => {
        setSummaryData(summary);
        setDailyData(daily);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [API_BASE, view]);

  const toggleExpand = (key: string) => {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !summaryData) {
    return (
      <main className="relative min-h-screen">
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-rose-400 text-sm">Error: {error || 'No data'}</div>
        </div>
      </main>
    );
  }

  const { summary, daily_stats } = summaryData;

  // 最新日付を取得 (daily_statsは日付昇順)
  const latestDate = daily_stats.length > 0
    ? daily_stats[daily_stats.length - 1].date.replace(/-/g, '/')
    : null;

  // 損益比較のバー幅計算
  const maxAbsProfit = Math.max(Math.abs(summary.long_profit), Math.abs(summary.short_profit));
  const longBarPct = maxAbsProfit > 0 ? (Math.abs(summary.long_profit) / maxAbsProfit) * 100 : 0;
  const shortBarPct = maxAbsProfit > 0 ? (Math.abs(summary.short_profit) / maxAbsProfit) * 100 : 0;

  return (
    <main className="relative min-h-screen">
      {/* Premium background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br from-primary/8 via-primary/3 to-transparent blur-3xl animate-pulse-slow" />
        <div className="absolute -bottom-1/3 -left-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-accent/10 via-accent/4 to-transparent blur-3xl animate-pulse-slower" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 leading-[1.8] tracking-[0.02em] font-sans">
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4 pb-3 border-b border-border/30">
          <div>
            <h1 className="text-xl font-bold text-foreground">Stock Results</h1>
            <p className="text-muted-foreground text-sm">
              取引結果 (2025/11/04{latestDate ? `-${latestDate}` : '以降'})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks links={["dashboard", "recommendations"]} />

            {/* パスキー関連 */}
            {hasPasskey === true ? (
              <span className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-400 bg-emerald-400/10 rounded-lg">
                <Check className="w-3.5 h-3.5" />
                パスキー登録済
              </span>
            ) : (
              <button
                onClick={handleRegisterPasskey}
                disabled={isRegisteringPasskey}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-500 hover:to-teal-500 transition-colors disabled:opacity-50"
              >
                <Fingerprint className="w-3.5 h-3.5" />
                {isRegisteringPasskey ? '登録中...' : 'パスキー登録'}
              </button>
            )}

            <button
              onClick={async () => {
                await signOut();
                router.push('/dev');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              ログアウト
            </button>
          </div>

          {/* パスキーメッセージ */}
          {passkeyMessage && (
            <div className={`w-full px-3 py-2 text-sm rounded-lg ${passkeyMessage.includes('失敗') || passkeyMessage.includes('再ログイン') ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {passkeyMessage}
            </div>
          )}
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {/* 損益 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">損益</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">合計</span>
                  <span className={`text-lg tabular-nums font-bold ${summary.total_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.total_profit >= 0 ? '+' : ''}{summary.total_profit.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ロング</span>
                  <span className={`text-sm tabular-nums ${summary.long_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.long_profit >= 0 ? '+' : ''}{summary.long_profit.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ショート</span>
                  <span className={`text-sm tabular-nums ${summary.short_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.short_profit >= 0 ? '+' : ''}{summary.short_profit.toLocaleString()}円
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 取引数 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">取引数</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">合計</span>
                  <span className="text-lg tabular-nums font-bold text-foreground">{summary.total_count}件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ロング</span>
                  <span className="text-sm tabular-nums text-orange-400">{summary.long_count}件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ショート</span>
                  <span className="text-sm tabular-nums text-teal-400">{summary.short_count}件</span>
                </div>
              </div>
            </div>
          </div>

          {/* 勝敗 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">勝敗</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">合計</span>
                  <span className="text-sm tabular-nums">
                    <span className="text-emerald-400">{summary.win_count}勝</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-rose-400">{summary.lose_count}敗</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ロング</span>
                  <span className="text-sm tabular-nums">
                    <span className="text-emerald-400">{summary.long_win}勝</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-rose-400">{summary.long_lose}敗</span>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ショート</span>
                  <span className="text-sm tabular-nums">
                    <span className="text-emerald-400">{summary.short_win}勝</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-rose-400">{summary.short_lose}敗</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 勝率 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">勝率</div>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">合計</span>
                  <span className={`text-lg tabular-nums font-bold ${summary.win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.win_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ロング</span>
                  <span className={`text-sm tabular-nums ${summary.long_win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.long_win_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground/70 text-xs">ショート</span>
                  <span className={`text-sm tabular-nums ${summary.short_win_rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.short_win_rate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section - 2x2 grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* 損益比較 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-sm mb-4">損益比較</div>
              <div className="space-y-3">
                {/* ロング */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">ロング</span>
                  <div className="flex-1 flex h-7">
                    <div className="flex-1 flex justify-end bg-muted/20 rounded-l">
                      {summary.long_profit < 0 && (
                        <div
                          className="h-full rounded-l"
                          style={{
                            width: `${longBarPct}%`,
                            background: 'linear-gradient(270deg, #991b1b, #ef4444)',
                          }}
                        />
                      )}
                    </div>
                    <div className="w-0.5 bg-border/50" />
                    <div className="flex-1 flex justify-start bg-muted/20 rounded-r">
                      {summary.long_profit >= 0 && (
                        <div
                          className="h-full rounded-r"
                          style={{
                            width: `${longBarPct}%`,
                            background: 'linear-gradient(90deg, #166534, #22c55e)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={`text-sm tabular-nums font-medium w-28 text-right ${summary.long_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.long_profit >= 0 ? '+' : ''}{summary.long_profit.toLocaleString()}円
                  </span>
                </div>
                {/* ショート */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-16">ショート</span>
                  <div className="flex-1 flex h-7">
                    <div className="flex-1 flex justify-end bg-muted/20 rounded-l">
                      {summary.short_profit < 0 && (
                        <div
                          className="h-full rounded-l"
                          style={{
                            width: `${shortBarPct}%`,
                            background: 'linear-gradient(270deg, #991b1b, #ef4444)',
                          }}
                        />
                      )}
                    </div>
                    <div className="w-0.5 bg-border/50" />
                    <div className="flex-1 flex justify-start bg-muted/20 rounded-r">
                      {summary.short_profit >= 0 && (
                        <div
                          className="h-full rounded-r"
                          style={{
                            width: `${shortBarPct}%`,
                            background: 'linear-gradient(90deg, #166534, #22c55e)',
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <span className={`text-sm tabular-nums font-medium w-28 text-right ${summary.short_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {summary.short_profit >= 0 ? '+' : ''}{summary.short_profit.toLocaleString()}円
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 勝率ゲージ */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-sm mb-4">勝率ゲージ</div>
              <div className="flex justify-around">
                {[
                  { label: 'ロング', rate: summary.long_win_rate },
                  { label: 'ショート', rate: summary.short_win_rate },
                ].map(({ label, rate }) => (
                  <div key={label} className="text-center">
                    <div
                      className="relative w-20 h-20 mx-auto"
                      style={{
                        background: `conic-gradient(${rate >= 50 ? '#22c55e' : '#ef4444'} ${rate * 3.6}deg, #333 0deg)`,
                        borderRadius: '50%',
                      }}
                    >
                      <div className="absolute inset-2 bg-card rounded-full flex items-center justify-center">
                        <span className={`text-base font-bold ${rate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {rate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-sm mt-2">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 損益水準分布 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-sm mb-3">損益水準分布</div>
              <div className="flex gap-5 mb-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-sm" />
                  <span className="text-muted-foreground">ロング</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-teal-500 rounded-sm" />
                  <span className="text-muted-foreground">ショート</span>
                </div>
              </div>
              <div className="space-y-2">
                {summaryData.loss_distribution.map(item => {
                  const maxCount = Math.max(...summaryData.loss_distribution.map(d => d.count));
                  const widthPct = (item.count / maxCount) * 100;
                  const longPct = item.count > 0 ? (item.long / item.count) * 100 : 0;

                  return (
                    <div key={item.range} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-muted-foreground whitespace-nowrap">{item.range}</span>
                      <div className="w-24 h-4 bg-muted/30 rounded overflow-hidden">
                        <div className="h-full flex" style={{ width: `${widthPct}%` }}>
                          <div className="h-full bg-orange-500" style={{ width: `${longPct}%` }} />
                          <div className="h-full bg-teal-500" style={{ width: `${100 - longPct}%` }} />
                        </div>
                      </div>
                      <span className="w-10 tabular-nums text-center whitespace-nowrap">
                        <span className="text-orange-400">{item.long}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-teal-400">{item.short}</span>
                      </span>
                      <span className={`w-16 text-right tabular-nums whitespace-nowrap ${item.total >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.total >= 0 ? '+' : ''}{item.total.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* インサイト */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-5 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-sm mb-4">インサイト</div>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="border-b border-border/20 pb-2">
                  ショート勝率 {summary.short_win_rate.toFixed(0)}% - {summary.short_win_rate >= 50 ? '得意パターン' : '要改善'}
                </li>
                <li className="border-b border-border/20 pb-2">
                  合計 <span className={summary.total_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {summary.total_profit >= 0 ? '+' : ''}{summary.total_profit.toLocaleString()}円
                  </span>
                </li>
                <li className="border-b border-border/20 pb-2">
                  ロング損切り-3万で圧縮可
                </li>
                <li>
                  ショートで利益を積み心理的余裕確保
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Trade List */}
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-xl shadow-black/5 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <span className="text-sm font-semibold text-foreground">取引一覧</span>
              <FilterButtonGroup
                options={[
                  { value: 'daily' as ViewType, label: '日別' },
                  { value: 'weekly' as ViewType, label: '週別' },
                  { value: 'monthly' as ViewType, label: '月別' },
                  { value: 'bystock' as ViewType, label: '銘柄別' },
                ]}
                value={view}
                onChange={setView}
              />
            </div>

            <div className="max-h-[500px] overflow-auto">
              {dailyData?.results.map(group => (
                <div key={group.key} className="border-b border-border/20 last:border-0">
                  <button
                    onClick={() => toggleExpand(group.key)}
                    className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedKeys.has(group.key) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-foreground font-medium whitespace-nowrap">{group.key}</span>
                      <span className={`tabular-nums font-medium whitespace-nowrap ${group.total_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {group.total_profit >= 0 ? '+' : ''}{group.total_profit.toLocaleString()}円
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 sm:mt-0 pl-6 sm:pl-0">
                      <span className="whitespace-nowrap">
                        ロング: <span className={group.long_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {group.long_profit >= 0 ? '+' : ''}{group.long_profit.toLocaleString()}円
                        </span>
                      </span>
                      <span className="whitespace-nowrap">
                        ショート: <span className={group.short_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {group.short_profit >= 0 ? '+' : ''}{group.short_profit.toLocaleString()}円
                        </span>
                      </span>
                    </div>
                  </button>

                  {expandedKeys.has(group.key) && (
                    <div className="px-4 pb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/30">
                            {view === 'bystock' && <th className="px-2 py-2 text-left text-muted-foreground font-medium">日付</th>}
                            {view !== 'bystock' && <th className="px-2 py-2 text-left text-muted-foreground font-medium">コード</th>}
                            {view !== 'bystock' && <th className="px-2 py-2 text-left text-muted-foreground font-medium">銘柄名</th>}
                            <th className="px-2 py-2 text-left text-muted-foreground font-medium">売買</th>
                            <th className="px-2 py-2 text-right text-muted-foreground font-medium">数量</th>
                            <th className="px-2 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">取得価額</th>
                            <th className="px-2 py-2 text-right text-muted-foreground font-medium whitespace-nowrap">売却単価</th>
                            <th className="px-2 py-2 text-right text-muted-foreground font-medium">損益</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {group.trades.map((trade, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              {view === 'bystock' && <td className="px-2 py-2 tabular-nums text-muted-foreground">{trade.date}</td>}
                              {view !== 'bystock' && <td className="px-2 py-2 tabular-nums">{trade.code}</td>}
                              {view !== 'bystock' && (
                                <td
                                  className={`px-2 py-2 max-w-[140px] truncate ${trade.profit <= -10000 ? 'text-rose-400' : ''}`}
                                  title={trade.name}
                                >
                                  {trade.name}
                                </td>
                              )}
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className={trade.position === 'ロング' ? 'text-orange-400' : 'text-teal-400'}>
                                  {trade.position}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{trade.qty.toLocaleString()}</td>
                              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{trade.avg_cost.toLocaleString()}</td>
                              <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{trade.avg_price.toLocaleString()}</td>
                              <td className={`px-2 py-2 text-right tabular-nums font-medium ${trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {trade.profit >= 0 ? '+' : ''}{trade.profit.toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground/60 text-xs mt-8 pt-6 border-t border-border/30">
          Stock Results v1.0 | 更新: {summaryData.updated_at ? new Date(summaryData.updated_at).toLocaleString('ja-JP') : '—'}
        </div>
      </div>
    </main>
  );
}

export default function StockResultsPage() {
  return (
    <ProtectedRoute requirePasskeySession={true}>
      <StockResultsContent />
    </ProtectedRoute>
  );
}
