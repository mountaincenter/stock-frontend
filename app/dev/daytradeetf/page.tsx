import { DevNavLinks } from "@/components/dev";
import { buildApiUrl } from "@/lib/api-base";

export const dynamic = "force-dynamic";

type Decision = {
  ticker?: string;
  action?: "WATCH" | "NO_TRADE";
  external_context_date?: string;
  external_label?: string;
  external_value?: number;
  watch_direction?: "LONG" | "SHORT" | "NO_TRADE";
  decision_status?: string;
};

type Summary = {
  trades: number;
  wins: number;
  losses: number;
  flats: number;
  win_rate_pct: number;
  profit_factor_bps: number | null;
  cash_profit_factor: number | null;
  total_pnl_yen: number;
  mean_pnl_yen: number;
  median_pnl_yen: number;
  mean_return_bps: number;
  median_return_bps: number;
  worst_pnl_yen: number;
  cvar_5pct_yen: number;
  max_drawdown_yen: number;
  stop_count: number;
  stop_rate_pct: number;
  date_start?: string;
  date_end?: string;
};

type ScopedSummary = Summary & {
  period_role?: string;
  direction?: string;
  month?: string;
  quarter?: string;
};

type BacktestTrade = {
  trading_date: string;
  period_role: string;
  selector_label: string;
  external_context_date: string;
  semiconductor_proxy_ret1_pct: number;
  market_proxy_ret1_pct: number;
  semis_vs_market_pct: number;
  us_semis_positive_count: number;
  us_semis_negative_count: number;
  direction: "LONG" | "SHORT";
  reference_open_time: string;
  reference_open: number;
  observation_time: string;
  observation_close: number;
  entry_time: string;
  entry_price: number;
  quantity: number;
  stop_price: number;
  session_close_time: string;
  session_close: number;
  exit_time: string;
  exit_price: number;
  exit_reason: "stop" | "stop_gap" | "session_close";
  return_bps: number;
  pnl_yen: number;
  no_stop_return_bps: number;
  no_stop_pnl_yen: number;
  mfe_yen: number;
  mfe_time: string;
  mae_yen: number;
  mae_time: string;
  cumulative_pnl_yen: number;
  drawdown_yen: number;
};

type BacktestEvidence = {
  schema_version: number;
  strategy_version: string;
  evidence_id: string;
  generated_at: string;
  payload_sha256: string;
  source_run: {
    run_id: string;
    audit_status: string;
    prior_outcomes_known: boolean;
    multiple_testing_disclosed: boolean;
    live_authorized: boolean;
    assessment: string;
    contract: { path: string; sha256: string };
  };
  parameters: {
    ticker: string;
    quantity: number;
    cost_bps: number;
    special_short_fee_included: boolean;
    slippage_included: boolean;
    strength_gate: string;
    trade_direction: string;
    confirmation: string;
    entry: string;
    stop: string;
    exit: string;
  };
  headline: Summary & {
    date_start: string;
    date_end: string;
    bootstrap_mean_ci_low_bps: number;
    bootstrap_mean_ci_high_bps: number;
  };
  period_roles: ScopedSummary[];
  directions: ScopedSummary[];
  months: ScopedSummary[];
  quarters: ScopedSummary[];
  stop_comparison: Array<Summary & { arm: string }>;
  equity_curve: Array<{
    trading_date: string;
    pnl_yen: number;
    cumulative_pnl_yen: number;
    drawdown_yen: number;
  }>;
  trades: BacktestTrade[];
  disclosures: string[];
};

type DaytradeEtfResponse = {
  snapshot: {
    generated_at: string;
    target_session: string;
    status: string;
    decision: Decision | null;
    reason: string | null;
  };
  operational: {
    state: "watch" | "no_trade" | "waiting" | "data_unavailable" | "stale";
    headline: string;
    guidance: string;
  };
  backtest: BacktestEvidence;
};

const periodLabels: Record<string, string> = {
  development: "開発",
  validation: "検証",
  recent_shadow: "直近シャドー",
};

const resultClass = (value: number) =>
  value > 0 ? "text-price-up" : value < 0 ? "text-price-down" : "text-price-neutral";

const number = (value: number, digits = 0) =>
  new Intl.NumberFormat("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);

const signed = (value: number, suffix = "", digits = 0) =>
  `${value > 0 ? "+" : ""}${number(value, digits)}${suffix}`;

const pf = (value: number | null) => (value === null ? "—" : number(value, 3));

async function loadDecision(): Promise<DaytradeEtfResponse> {
  const response = await fetch(buildApiUrl("/api/dev/daytrade-etf"), {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`07:00判定を取得できませんでした（HTTP ${response.status}）`);
  }
  return response.json();
}

function formatJst(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function watchRule(direction?: Decision["watch_direction"]): string {
  if (direction === "SHORT") {
    return "09:09または09:10の終値が寄付を下回った場合、次の実足で売り";
  }
  if (direction === "LONG") {
    return "09:09または09:10の終値が寄付を上回った場合、次の実足で買い";
  }
  return "取引しない";
}

function EquityCurve({ rows }: { rows: BacktestEvidence["equity_curve"] }) {
  const width = 960;
  const height = 220;
  const padX = 42;
  const padY = 20;
  const values = rows.flatMap((row) => [row.cumulative_pnl_yen, row.drawdown_yen, 0]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const x = (index: number) => padX + (index / Math.max(1, rows.length - 1)) * (width - padX * 2);
  const y = (value: number) => padY + ((max - value) / range) * (height - padY * 2);
  const points = (key: "cumulative_pnl_yen" | "drawdown_yen") =>
    rows.map((row, index) => `${x(index).toFixed(1)},${y(row[key]).toFixed(1)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 min-w-[720px] w-full" role="img" aria-label="累積損益とドローダウン推移">
        <line x1={padX} y1={y(0)} x2={width - padX} y2={y(0)} className="stroke-border" strokeWidth="1" />
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} className="stroke-border" strokeWidth="1" />
        <polyline points={points("drawdown_yen")} fill="none" stroke="var(--price-down)" strokeWidth="2" opacity="0.75" />
        <polyline points={points("cumulative_pnl_yen")} fill="none" stroke="var(--price-up)" strokeWidth="2.5" />
        <text x="4" y={y(max) + 4} className="fill-muted-foreground text-[11px]">{signed(max, "円")}</text>
        <text x="4" y={y(min) + 4} className="fill-muted-foreground text-[11px]">{signed(min, "円")}</text>
        <text x={padX} y={height - 2} className="fill-muted-foreground text-[11px]">{rows[0]?.trading_date}</text>
        <text x={width - padX} y={height - 2} textAnchor="end" className="fill-muted-foreground text-[11px]">{rows.at(-1)?.trading_date}</text>
      </svg>
      <div className="flex justify-end gap-4 text-xs text-muted-foreground">
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-[var(--price-up)] align-middle" />累積損益</span>
        <span><span className="mr-1 inline-block h-0.5 w-4 bg-[var(--price-down)] align-middle" />ドローダウン</span>
      </div>
    </div>
  );
}

function SummaryTable({ rows, label }: { rows: ScopedSummary[]; label: "period_role" | "direction" | "month" | "quarter" }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-border/60 text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">区分</th>
            <th className="px-3 py-2 text-left font-medium">期間</th>
            <th className="px-3 py-2 text-right font-medium">件数</th>
            <th className="px-3 py-2 text-right font-medium">PF（収益率）</th>
            <th className="px-3 py-2 text-right font-medium">勝率</th>
            <th className="px-3 py-2 text-right font-medium">合計</th>
            <th className="px-3 py-2 text-right font-medium">中央値</th>
            <th className="px-3 py-2 text-right font-medium">最大DD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const raw = String(row[label] ?? "—");
            const display = label === "period_role" ? periodLabels[raw] ?? raw : raw;
            return (
              <tr key={`${label}-${raw}`} className="border-b border-border/30 hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{display}</td>
                <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">{row.date_start}〜{row.date_end}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.trades}</td>
                <td className="px-3 py-2 text-right tabular-nums">{pf(row.profit_factor_bps)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{number(row.win_rate_pct, 1)}%</td>
                <td className={`px-3 py-2 text-right tabular-nums ${resultClass(row.total_pnl_yen)}`}>{signed(row.total_pnl_yen, "円")}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${resultClass(row.median_pnl_yen)}`}>{signed(row.median_pnl_yen, "円")}</td>
                <td className="px-3 py-2 text-right tabular-nums text-price-down">{signed(row.max_drawdown_yen, "円")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function DaytradeEtfPage() {
  let data: DaytradeEtfResponse | null = null;
  let error: string | null = null;
  try {
    data = await loadDecision();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "07:00判定を取得できませんでした";
  }

  const decision = data?.snapshot.decision;
  const evidence = data?.backtest;
  const isWatch = data?.operational.state === "watch";
  const directionLabel = isWatch
    ? decision?.watch_direction === "SHORT"
      ? "SHORT監視"
      : "LONG監視"
    : data?.operational.state === "waiting"
      ? "07:00判定待ち"
      : data?.operational.state === "data_unavailable"
        ? "判定不能"
        : data?.operational.state === "stale"
          ? "当日判定なし"
          : "NO TRADE";
  const directionClass =
    decision?.watch_direction === "SHORT" && isWatch
      ? "text-price-down"
      : decision?.watch_direction === "LONG" && isWatch
        ? "text-price-up"
        : "text-muted-foreground";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <header className="mb-4 flex flex-wrap items-center gap-3 border-b border-border/50 pb-3">
          <div>
            <h1 className="text-xl font-bold">Daytrade ETF</h1>
            <p className="text-xs text-muted-foreground">200A 07:00判定・09:10確認・バックテスト監査</p>
          </div>
          <DevNavLinks className="ml-auto overflow-x-auto" />
        </header>

        {error || !data || !evidence ? (
          <section className="rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-sm text-destructive">
            <h2 className="font-semibold">判定または検証データなし</h2>
            <p className="mt-2">{error ?? "API契約に必要なデータがありません"}</p>
            <p className="mt-2">判定を確認できない日は取引しない。</p>
          </section>
        ) : (
          <div className="space-y-3">
            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">{data.snapshot.target_session} / 200A</div>
                  <div className={`mt-1 text-2xl font-bold tabular-nums ${directionClass}`}>{directionLabel}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground tabular-nums">
                  <div>生成 {formatJst(data.snapshot.generated_at)}</div>
                  <div className="mt-1">
                    {decision?.external_label ?? data.snapshot.status}
                    {typeof decision?.external_value === "number" ? ` ${signed(decision.external_value, "%", 3)}` : ""}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-base font-semibold">本日の固定条件</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm md:grid-cols-[8rem_1fr]">
                <dt className="text-muted-foreground">09:10確認</dt>
                <dd className="font-medium">{isWatch ? watchRule(decision?.watch_direction) : "取引しない"}</dd>
                <dt className="text-muted-foreground">建玉</dt><dd>200A・10口</dd>
                <dt className="text-muted-foreground">Stop</dt><dd>建値から逆方向へ50円（計画損失500円。ギャップ約定時は超過あり）</dd>
                <dt className="text-muted-foreground">Exit</dt><dd>当日大引け・持越しなし</dd>
              </dl>
              <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">再エントリー、買い増し、ナンピン、ヘッジ、反転売買をしない。条件不成立はノートレ。</p>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-semibold">バックテスト結果</h2>
                <p className="text-xs tabular-nums text-muted-foreground">{evidence.headline.date_start}〜{evidence.headline.date_end} / evidence {evidence.evidence_id}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
                {[
                  ["取引", `${evidence.headline.trades}件`, ""],
                  ["PF（収益率）", pf(evidence.headline.profit_factor_bps), ""],
                  ["PF（円損益）", pf(evidence.headline.cash_profit_factor), ""],
                  ["総損益", signed(evidence.headline.total_pnl_yen, "円"), resultClass(evidence.headline.total_pnl_yen)],
                  ["勝率", `${number(evidence.headline.win_rate_pct, 1)}%`, ""],
                  ["中央値", signed(evidence.headline.median_pnl_yen, "円"), resultClass(evidence.headline.median_pnl_yen)],
                  ["最大DD", signed(evidence.headline.max_drawdown_yen, "円"), "text-price-down"],
                  ["Stop", `${evidence.headline.stop_count}件`, ""],
                ].map(([label, value, className]) => (
                  <div key={label} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className={`mt-1 font-semibold tabular-nums ${className}`}>{value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-400">
                重要：これは基礎結果を確認した後に選んだ回顧的候補で、未使用データによる最終確認ではない。0 bpsで、特別空売り料とスリッページは未反映。forward運用の自動採用を意味しない。
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-base font-semibold">検証したルール</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm md:grid-cols-[9rem_1fr]">
                <dt className="text-muted-foreground">対象・数量</dt><dd>200A・10口固定</dd>
                <dt className="text-muted-foreground">寄前選別</dt><dd>米半導体の方向を判定し、|SMH日次騰落率|が1.0%以上2.0%未満の日だけ対象</dd>
                <dt className="text-muted-foreground">監視方向</dt><dd>対象となった米半導体方向と逆方向</dd>
                <dt className="text-muted-foreground">09:10確認</dt><dd>09:09または09:10終値が、200Aの寄付から監視方向へ動いた場合だけ成立</dd>
                <dt className="text-muted-foreground">Entry</dt><dd>成立後、09:15までに存在する次の1分足の始値</dd>
                <dt className="text-muted-foreground">Stop / Exit</dt><dd>逆行50円でStop。未到達なら当日大引けで全決済</dd>
                <dt className="text-muted-foreground">費用</dt><dd>売買コスト0 bps。特別空売り料・スリッページは未反映</dd>
              </dl>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-base font-semibold">累積損益・ドローダウン</h2>
              <p className="mt-1 text-xs text-muted-foreground">10口・各取引を日付順に1回ずつ加算。初期残高0円。</p>
              <EquityCurve rows={evidence.equity_curve} />
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <h2 className="text-base font-semibold">期間分割</h2>
              <p className="mt-1 text-xs text-muted-foreground">開発・検証・直近シャドーを混ぜずに表示。</p>
              <div className="mt-2"><SummaryTable rows={evidence.period_roles} label="period_role" /></div>
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section className="rounded-xl border border-border bg-card px-4 py-3">
                <h2 className="text-base font-semibold">売買方向別</h2>
                <div className="mt-2"><SummaryTable rows={evidence.directions} label="direction" /></div>
              </section>
              <section className="rounded-xl border border-border bg-card px-4 py-3">
                <h2 className="text-base font-semibold">50円Stopの比較</h2>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead><tr className="border-b border-border/60 text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Exit</th><th className="px-3 py-2 text-right font-medium">PF（収益率）</th><th className="px-3 py-2 text-right font-medium">総損益</th><th className="px-3 py-2 text-right font-medium">最悪</th><th className="px-3 py-2 text-right font-medium">最大DD</th>
                    </tr></thead>
                    <tbody>{evidence.stop_comparison.map((row) => <tr key={row.arm} className="border-b border-border/30">
                      <td className="px-3 py-2 font-medium">{row.arm === "stop_50_yen" ? "50円Stop" : "Stopなし・大引け"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{pf(row.profit_factor_bps)}</td>
                      <td className={`px-3 py-2 text-right tabular-nums ${resultClass(row.total_pnl_yen)}`}>{signed(row.total_pnl_yen, "円")}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-price-down">{signed(row.worst_pnl_yen, "円")}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-price-down">{signed(row.max_drawdown_yen, "円")}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              </section>
            </div>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <details open>
                <summary className="cursor-pointer text-base font-semibold">四半期別</summary>
                <div className="mt-2"><SummaryTable rows={evidence.quarters} label="quarter" /></div>
              </details>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <details>
                <summary className="cursor-pointer text-base font-semibold">月次別</summary>
                <div className="mt-2"><SummaryTable rows={evidence.months} label="month" /></div>
              </details>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">全51取引明細</h2>
                <p className="text-xs text-muted-foreground">MFE/MAEは10口の最大含み益/最大含み損</p>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[1500px] text-sm">
                  <thead><tr className="border-b border-border/60 text-muted-foreground">
                    {[
                      ["日付", "left"], ["区分", "left"], ["米半導体", "right"], ["売買", "left"], ["確認", "left"], ["Entry", "right"], ["Stop", "right"], ["Exit", "right"], ["理由", "left"], ["損益", "right"], ["累積", "right"], ["DD", "right"], ["MFE", "right"], ["MAE", "right"],
                    ].map(([title, align]) => <th key={title} className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>{title}</th>)}
                  </tr></thead>
                  <tbody>{[...evidence.trades].reverse().map((trade) => <tr key={trade.trading_date} className="border-b border-border/30 hover:bg-muted/30">
                    <td className="px-3 py-2 tabular-nums">{trade.trading_date}</td>
                    <td className="px-3 py-2 text-xs">{periodLabels[trade.period_role] ?? trade.period_role}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${resultClass(trade.semiconductor_proxy_ret1_pct)}`}>{signed(trade.semiconductor_proxy_ret1_pct, "%", 3)}</td>
                    <td className={`px-3 py-2 font-semibold ${trade.direction === "LONG" ? "text-price-up" : "text-price-down"}`}>{trade.direction}</td>
                    <td className="px-3 py-2 tabular-nums">{trade.observation_time}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{trade.entry_time} / {number(trade.entry_price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{number(trade.stop_price)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{trade.exit_time} / {number(trade.exit_price)}</td>
                    <td className="px-3 py-2 text-xs">{trade.exit_reason === "session_close" ? "大引け" : trade.exit_reason === "stop_gap" ? "Gap Stop" : "Stop"}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${resultClass(trade.pnl_yen)}`}>{signed(trade.pnl_yen, "円")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${resultClass(trade.cumulative_pnl_yen)}`}>{signed(trade.cumulative_pnl_yen, "円")}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${resultClass(trade.drawdown_yen)}`}>{signed(trade.drawdown_yen, "円")}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-price-up">+{number(trade.mfe_yen)}円</td>
                    <td className="px-3 py-2 text-right tabular-nums text-price-down">-{number(trade.mae_yen)}円</td>
                  </tr>)}</tbody>
                </table>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
              <h2 className="text-sm font-semibold text-foreground">検証契約・監査</h2>
              <dl className="mt-2 grid gap-x-4 gap-y-1 md:grid-cols-[9rem_1fr]">
                <dt>Run</dt><dd className="font-mono">{evidence.source_run.run_id}</dd>
                <dt>Audit</dt><dd>{evidence.source_run.audit_status}（採用したv11成果物のhashを再照合）</dd>
                <dt>Contract</dt><dd className="break-all font-mono">{evidence.source_run.contract.path}</dd>
                <dt>Payload SHA-256</dt><dd className="break-all font-mono">{evidence.payload_sha256}</dd>
                <dt>Bootstrap mean</dt><dd className="tabular-nums">95% CI {number(evidence.headline.bootstrap_mean_ci_low_bps, 2)}〜{number(evidence.headline.bootstrap_mean_ci_high_bps, 2)} bps</dd>
                <dt>Live authorized</dt><dd>{String(evidence.source_run.live_authorized)}</dd>
              </dl>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
