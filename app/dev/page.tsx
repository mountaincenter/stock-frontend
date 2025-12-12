"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { ChevronDown, ChevronUp, Search, ArrowUpRight, Settings, Fingerprint, Trash2, X } from "lucide-react";
import { DashboardData } from "@/lib/grok-backtest-types";
import MarketSummary from "@/components/MarketSummary";
import { DevNavLinks, FilterButtonGroup } from "@/components/dev";
import { useAuth } from "../../src/components/auth/AuthProvider";

interface PasskeyCredential {
  credentialId?: string;
  friendlyCredentialName?: string;
  relyingPartyId?: string;
  createdAt?: Date;
}

type SortField = "date" | "win_rate" | "count";
type SortDirection = "asc" | "desc";
type Phase = "phase1" | "phase2" | "phase3";

const PHASE_INFO = {
  phase1: { label: "Phase 1", title: "前場引け売り", description: "9:00→11:30" },
  phase2: { label: "Phase 2", title: "大引け売り", description: "9:00→15:30" },
  phase3: { label: "Phase 3", title: "利確損切", description: "±3%" },
} as const;

export default function DevDashboard() {
  const { isAuthenticated, user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMetric, setSelectedMetric] = useState<"return" | "winrate" | "cumulative">("return");
  const [dateFilter, setDateFilter] = useState<"all" | "week" | "month">("all");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase>("phase2");

  // 設定モーダル
  const [showSettings, setShowSettings] = useState(false);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [passkeyError, setPasskeyError] = useState<string | null>(null);
  const [passkeySuccess, setPasskeySuccess] = useState<string | null>(null);

  // ログインフォーム（設定モーダル内）
  const [settingsEmail, setSettingsEmail] = useState('');
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsLoginLoading, setSettingsLoginLoading] = useState(false);
  const [settingsLoginError, setSettingsLoginError] = useState<string | null>(null);

  // パスキー一覧取得
  async function loadPasskeys() {
    if (!isAuthenticated) return;
    setPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const { listWebAuthnCredentials } = await import('aws-amplify/auth');
      const result = await listWebAuthnCredentials();
      setPasskeys(result.credentials || []);
    } catch (err) {
      console.error('Failed to load passkeys:', err);
      setPasskeyError('パスキー一覧の取得に失敗しました');
    } finally {
      setPasskeyLoading(false);
    }
  }

  // パスキー削除
  async function deletePasskey(credentialId: string | undefined) {
    if (!credentialId) return;
    if (!confirm('このパスキーを削除しますか？')) return;
    setPasskeyLoading(true);
    setPasskeyError(null);
    try {
      const { deleteWebAuthnCredential } = await import('aws-amplify/auth');
      await deleteWebAuthnCredential({ credentialId });
      setPasskeys(prev => prev.filter(p => p.credentialId !== credentialId));
      setPasskeySuccess('パスキーを削除しました');
    } catch (err) {
      console.error('Failed to delete passkey:', err);
      setPasskeyError('パスキーの削除に失敗しました');
    } finally {
      setPasskeyLoading(false);
    }
  }

  // パスキー登録
  async function registerPasskey() {
    setPasskeyLoading(true);
    setPasskeyError(null);
    setPasskeySuccess(null);
    try {
      const { associateWebAuthnCredential } = await import('aws-amplify/auth');
      await associateWebAuthnCredential();
      setPasskeySuccess('パスキーを登録しました！');
      // メールアドレスをlocalStorageに保存
      if (settingsEmail) {
        localStorage.setItem('saved_login_email', settingsEmail);
      }
      loadPasskeys();
    } catch (err) {
      console.error('Passkey registration error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setPasskeyError(`パスキー登録に失敗: ${errorMessage}`);
    } finally {
      setPasskeyLoading(false);
    }
  }

  // 設定モーダル内ログイン
  async function handleSettingsLogin(e: React.FormEvent) {
    e.preventDefault();
    setSettingsLoginLoading(true);
    setSettingsLoginError(null);
    try {
      const { signIn } = await import('aws-amplify/auth');
      const { isSignedIn } = await signIn({
        username: settingsEmail,
        password: settingsPassword,
      });
      if (isSignedIn) {
        // ログイン成功 - パスキー一覧を読み込み
        localStorage.setItem('saved_login_email', settingsEmail);
        setSettingsPassword('');
        // 認証状態が更新されるまで少し待つ
        setTimeout(() => {
          loadPasskeys();
        }, 500);
      }
    } catch (err) {
      console.error('Settings login error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ログインに失敗しました';
      setSettingsLoginError(errorMessage);
    } finally {
      setSettingsLoginLoading(false);
    }
  }

  // 設定モーダル開く時にパスキー一覧取得 & メール復元
  useEffect(() => {
    if (showSettings) {
      setPasskeyError(null);
      setPasskeySuccess(null);
      setSettingsLoginError(null);
      const savedEmail = localStorage.getItem('saved_login_email');
      if (savedEmail) {
        setSettingsEmail(savedEmail);
      }
      if (isAuthenticated) {
        loadPasskeys();
      }
    }
  }, [showSettings, isAuthenticated]);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const params = new URLSearchParams();
    params.append("phase", selectedPhase);
    if (selectedVersion) params.append("prompt_version", selectedVersion);

    setLoading(true);
    fetch(`${API_BASE}/api/dev/backtest/summary?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [selectedVersion, selectedPhase]);

  const sortedStats = useMemo(() => {
    if (!dashboardData) return [];
    const sorted = dashboardData.daily_stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    let dateFiltered = sorted;
    if (dateFilter === "week") dateFiltered = sorted.slice(-7);
    else if (dateFilter === "month") dateFiltered = sorted.slice(-30);

    const filtered = dateFiltered.filter((stat) => stat.date.includes(searchTerm));
    filtered.sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === "asc" ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });
    return filtered;
  }, [dashboardData, sortField, sortDirection, searchTerm, dateFilter]);

  const filteredDailyStats = useMemo(() => {
    if (!dashboardData) return [];
    const sorted = dashboardData.daily_stats.slice().sort((a, b) => a.date.localeCompare(b.date));
    if (dateFilter === "all") return sorted;
    return sorted.slice(dateFilter === "week" ? -7 : -30);
  }, [dashboardData, dateFilter]);

  const chartData = useMemo(() => {
    return filteredDailyStats.map((s) => ({
      date: new Date(s.date).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
      avg: s.avg_return ?? 0,
      top5: s.top5_avg_return ?? 0,
      winRate: s.win_rate ?? 0,
      top5WinRate: s.top5_win_rate ?? 0,
      cumulative: s.cumulative_profit_per_100 ?? 0,
      top5Cumulative: s.cumulative_top5_profit_per_100 ?? 0,
    }));
  }, [filteredDailyStats]);

  // 期間フィルターに合わせた統計を計算
  const filteredStats = useMemo(() => {
    if (filteredDailyStats.length === 0) return null;

    // 全体統計
    const totalCount = filteredDailyStats.reduce((sum, s) => sum + (s.count ?? 0), 0);
    // win_countはないのでwin_rateとcountから計算
    const winCount = filteredDailyStats.reduce((sum, s) => {
      const count = s.count ?? 0;
      const winRate = s.win_rate ?? 0;
      return sum + Math.round(count * winRate / 100);
    }, 0);
    const totalProfit = filteredDailyStats.reduce((sum, s) => sum + (s.total_profit_per_100 ?? 0), 0);

    // Top5統計
    const top5TotalProfit = filteredDailyStats.reduce((sum, s) => sum + (s.top5_total_profit_per_100 ?? 0), 0);
    // top5_win_countはないのでtop5_win_rateから計算（各日5銘柄）
    const top5WinCount = filteredDailyStats.reduce((sum, s) => {
      const top5WinRate = s.top5_win_rate ?? 0;
      return sum + Math.round(5 * top5WinRate / 100);
    }, 0);
    const top5Count = filteredDailyStats.length * 5; // 各日5銘柄

    return {
      overall: {
        win_rate: totalCount > 0 ? (winCount / totalCount) * 100 : 0,
        valid_count: totalCount,
        avg_profit_per_100_shares: totalCount > 0 ? totalProfit / totalCount : 0,
        total_profit_per_100_shares: totalProfit,
        total_days: filteredDailyStats.length,
      },
      top5: {
        win_rate: top5Count > 0 ? (top5WinCount / top5Count) * 100 : 0,
        avg_profit_per_100_shares: top5Count > 0 ? top5TotalProfit / top5Count : 0,
        total_profit_per_100_shares: top5TotalProfit,
      },
    };
  }, [filteredDailyStats]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  if (loading) {
    return (
      <div className="tv-dark min-h-screen bg-[var(--tv-bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--tv-accent)] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-[var(--tv-text-secondary)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="tv-dark min-h-screen bg-[var(--tv-bg-primary)] flex items-center justify-center">
        <div className="text-[var(--tv-down)] text-sm">Error: {error || "No data"}</div>
      </div>
    );
  }

  // dateFilter が "all" の場合は元データ、それ以外はフィルター済みデータを使用
  const displayStats = dateFilter === "all"
    ? { overall: dashboardData.overall_stats, top5: dashboardData.top5_stats }
    : filteredStats ?? { overall: dashboardData.overall_stats, top5: dashboardData.top5_stats };

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
            <h1 className="text-xl font-bold text-foreground">GROK Backtest</h1>
            <p className="text-muted-foreground text-sm">
              {PHASE_INFO[selectedPhase].title} ({PHASE_INFO[selectedPhase].description})
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <DevNavLinks links={["recommendations", "stock-results", "v3", "ifo"]} />

            <div className="flex items-center gap-2">
              <FilterButtonGroup
                options={[
                  { value: "phase1" as Phase, label: "P1" },
                  { value: "phase2" as Phase, label: "P2" },
                  { value: "phase3" as Phase, label: "P3" },
                ]}
                value={selectedPhase}
                onChange={setSelectedPhase}
              />

              <FilterButtonGroup
                options={[
                  { value: "week" as const, label: "7D" },
                  { value: "month" as const, label: "30D" },
                  { value: "all" as const, label: "ALL" },
                ]}
                value={dateFilter}
                onChange={setDateFilter}
              />

              {/* 設定ボタン */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                title="設定"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* 設定モーダル */}
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border border-border shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h2 className="text-lg font-semibold text-foreground">設定</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* ユーザー情報 */}
                {isAuthenticated && user && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">ログイン中</div>
                    <div className="text-sm text-foreground truncate">
                      {user.signInDetails?.loginId || user.username}
                    </div>
                  </div>
                )}

                {/* パスキー管理 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Fingerprint className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-medium text-foreground">パスキー管理</span>
                  </div>

                  {passkeyError && (
                    <div className="p-2 mb-3 text-xs text-rose-400 bg-rose-400/10 rounded-lg">
                      {passkeyError}
                    </div>
                  )}

                  {passkeySuccess && (
                    <div className="p-2 mb-3 text-xs text-emerald-400 bg-emerald-400/10 rounded-lg">
                      {passkeySuccess}
                    </div>
                  )}

                  {!isAuthenticated ? (
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">パスキー登録・解除にはログインが必要です</p>

                      {settingsLoginError && (
                        <div className="p-2 text-xs text-rose-400 bg-rose-400/10 rounded-lg">
                          {settingsLoginError}
                        </div>
                      )}

                      <form onSubmit={handleSettingsLogin} className="space-y-3">
                        <input
                          type="email"
                          value={settingsEmail}
                          onChange={(e) => setSettingsEmail(e.target.value)}
                          placeholder="メールアドレス"
                          required
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <input
                          type="password"
                          value={settingsPassword}
                          onChange={(e) => setSettingsPassword(e.target.value)}
                          placeholder="パスワード"
                          required
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                        <button
                          type="submit"
                          disabled={settingsLoginLoading}
                          className="w-full py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {settingsLoginLoading ? 'ログイン中...' : 'ログイン'}
                        </button>
                      </form>
                    </div>
                  ) : passkeyLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* パスキー登録ボタン */}
                      <button
                        onClick={registerPasskey}
                        disabled={passkeyLoading}
                        className="w-full mb-3 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-500 hover:to-teal-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Fingerprint className="w-4 h-4" />
                        新しいパスキーを登録
                      </button>

                      {passkeys.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          登録済みのパスキーはありません
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {passkeys.map((passkey, index) => (
                            <div
                              key={passkey.credentialId || index}
                              className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-foreground truncate">
                                  {passkey.friendlyCredentialName || 'パスキー'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {passkey.createdAt ? new Date(passkey.createdAt).toLocaleDateString('ja-JP') : ''}
                                </div>
                              </div>
                              <button
                                onClick={() => deletePasskey(passkey.credentialId)}
                                disabled={passkeyLoading || !passkey.credentialId}
                                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 rounded-lg transition-colors disabled:opacity-50"
                                title="削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          {/* Win Rate - All */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">勝率</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.overall.win_rate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.overall.win_rate?.toFixed(1) ?? "—"}%
              </div>
              <div className="text-muted-foreground/70 text-xs mt-1 text-right">{displayStats.overall.valid_count}件</div>
            </div>
          </div>

          {/* Win Rate - Top5 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">Top5勝率</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.top5.win_rate >= 50 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.top5.win_rate.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Avg Profit - All */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">平均損益</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.overall.avg_profit_per_100_shares >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.overall.avg_profit_per_100_shares >= 0 ? "+" : ""}{Math.round(displayStats.overall.avg_profit_per_100_shares).toLocaleString()}円
              </div>
              <div className="text-muted-foreground/70 text-xs mt-1 text-right">100株あたり</div>
            </div>
          </div>

          {/* Avg Profit - Top5 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">Top5平均</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.top5.avg_profit_per_100_shares >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.top5.avg_profit_per_100_shares >= 0 ? "+" : ""}{Math.round(displayStats.top5.avg_profit_per_100_shares).toLocaleString()}円
              </div>
            </div>
          </div>

          {/* Total Profit - All */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">累計損益</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.overall.total_profit_per_100_shares >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.overall.total_profit_per_100_shares >= 0 ? "+" : ""}{Math.round(displayStats.overall.total_profit_per_100_shares).toLocaleString()}円
              </div>
              <div className="text-muted-foreground/70 text-xs mt-1 text-right">{displayStats.overall.total_days}日</div>
            </div>
          </div>

          {/* Total Profit - Top5 */}
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="text-muted-foreground text-xs mb-2">Top5累計</div>
              <div className={`text-2xl tabular-nums font-bold text-right ${displayStats.top5.total_profit_per_100_shares >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {displayStats.top5.total_profit_per_100_shares >= 0 ? "+" : ""}{Math.round(displayStats.top5.total_profit_per_100_shares).toLocaleString()}円
              </div>
            </div>
          </div>
        </div>

        {/* Chart + Table Grid */}
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {/* Chart */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-foreground">パフォーマンス</span>
                <div className="flex gap-1">
                  {(["return", "winrate", "cumulative"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setSelectedMetric(m)}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all ${selectedMetric === m ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
                    >
                      {m === "return" ? "リターン" : m === "winrate" ? "勝率" : "累計"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <ResponsiveContainer width="100%" height={260}>
                  {selectedMetric === "return" ? (
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} />
                      <YAxis stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        labelStyle={{ color: "var(--foreground)" }}
                        formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name === "avg" ? "全体" : "Top5"]}
                      />
                      <Legend formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>} />
                      <Area type="monotone" dataKey="avg" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="全体" />
                      <Area type="monotone" dataKey="top5" stroke="#34d399" fill="#34d399" fillOpacity={0.15} name="Top5" />
                    </AreaChart>
                  ) : selectedMetric === "winrate" ? (
                    <BarChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} />
                      <YAxis stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, "勝率"]}
                      />
                      <Legend formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>} />
                      <Bar dataKey="winRate" name="勝率" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.winRate >= 50 ? "#34d399" : "#fb7185"} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.3} strokeDasharray="3 3" />
                      <XAxis dataKey="date" stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} />
                      <YAxis stroke="var(--border)" tick={{ fill: "#9ca3af" }} fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(1)}千円`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString()}円`, name === "cumulative" ? "全体" : "Top5"]}
                      />
                      <Legend formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 11 }}>{value}</span>} />
                      <Area type="monotone" dataKey="cumulative" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} name="全体" />
                      <Area type="monotone" dataKey="top5Cumulative" stroke="#34d399" fill="#34d399" fillOpacity={0.15} name="Top5" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-xl shadow-black/5 backdrop-blur-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold text-foreground">履歴</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm bg-muted/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
              <div className="overflow-auto max-h-[280px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card/80 backdrop-blur-sm">
                    <tr className="border-b border-border/30">
                      <th className="px-4 py-2.5 text-left text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("date")}>
                        <div className="flex items-center gap-1">
                          日付 {sortField === "date" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-right text-muted-foreground font-medium">件数</th>
                      <th className="px-3 py-2.5 text-right text-muted-foreground font-medium cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort("win_rate")}>
                        <div className="flex items-center justify-end gap-1">
                          勝率 {sortField === "win_rate" && (sortDirection === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                        </div>
                      </th>
                      <th className="px-3 py-2.5 text-right text-muted-foreground font-medium">損益</th>
                      <th className="px-3 py-2.5 text-right text-muted-foreground font-medium">Top5</th>
                      <th className="px-3 py-2.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {sortedStats.slice(0, 20).map((stat) => (
                      <tr key={stat.date} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 tabular-nums text-foreground/90">{stat.date}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">{stat.count}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-foreground/90">{stat.win_rate?.toFixed(1) ?? "—"}%</td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${stat.total_profit_per_100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stat.total_profit_per_100 >= 0 ? "+" : ""}{Math.round(stat.total_profit_per_100).toLocaleString()}円
                        </td>
                        <td className={`px-3 py-2.5 text-right tabular-nums font-medium ${stat.top5_total_profit_per_100 >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stat.top5_total_profit_per_100 >= 0 ? "+" : ""}{Math.round(stat.top5_total_profit_per_100).toLocaleString()}円
                        </td>
                        <td className="px-3 py-2.5">
                          <Link href={`/dev/daily/${stat.date}`} className="text-primary hover:text-primary/80 transition-colors">
                            <ArrowUpRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <MarketSummary className="mt-6" />

        {/* Footer */}
        <div className="text-center text-muted-foreground/60 text-xs mt-8 pt-6 border-t border-border/30">
          GROK Backtest Dashboard v2.0
        </div>
      </div>
    </main>
  );
}
