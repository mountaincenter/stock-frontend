"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DevNavLinks } from "@/components/dev";
import { RefreshCw, Shield, TrendingDown, TrendingUp } from "lucide-react";
import type { IChartApi } from "lightweight-charts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";

type PriceRow = {
  date: string;
  Open: number | null;
  High: number | null;
  Low: number | null;
  Close: number | null;
  Volume?: number | null;
};

type Level = {
  label: string;
  price: number;
  kind: "risk" | "support" | "ma" | "neutral";
};

type Holding = {
  direction: string;
  margin_type: string;
  deadline: string;
  quantity: number;
  entry_price: number | null;
  current_price: number | null;
  jnx_price: number | null;
  market_value: number | null;
  unrealized_pnl: number;
  unrealized_pct: number | null;
  expiry_date?: string | null;
};

type Trade = {
  trade_date: string | null;
  side: string;
  margin_type: string;
  realized_pnl: number;
  price: number | null;
  quantity: number | null;
  avg_cost: number | null;
  entry_date?: string | null;
};

type Position = {
  ticker: string;
  code: string;
  name: string;
  role: string;
  stance: string;
  rules: string[];
  summary: {
    long_qty: number;
    short_qty: number;
    long_unrealized: number;
    short_unrealized: number;
    net_unrealized: number;
    realized_total: number;
    total_pnl: number;
    hedged: boolean;
  };
  holdings: Holding[];
  latest_trades: Trade[];
  levels: Level[];
  daily_rows: PriceRow[];
  intraday_rows: PriceRow[];
};

type HedgePayload = {
  as_of: string;
  source: Record<string, string>;
  portfolio: {
    watch_count: number;
    unrealized_pnl: number;
    realized_pnl: number;
    total_pnl: number;
  };
  rules: string[];
  positions: Position[];
};

function yen(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  const rounded = Math.round(value);
  return `${rounded >= 0 ? "+" : ""}${rounded.toLocaleString("ja-JP")}`;
}

function num(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("ja-JP");
}

function pnlClass(value?: number | null) {
  if (value == null) return "text-muted-foreground";
  return value >= 0 ? "text-emerald-400" : "text-rose-400";
}

function levelColor(kind: Level["kind"]) {
  if (kind === "risk") return "#ef4444";
  if (kind === "support") return "#22c55e";
  if (kind === "ma") return "#eab308";
  return "#94a3b8";
}

function uniqueLevels(levels: Level[]) {
  const seenPrices = new Set<number>();
  return levels
    .filter((level) => {
      const key = Math.round(level.price);
      if (seenPrices.has(key)) return false;
      seenPrices.add(key);
      return true;
    })
    .sort((a, b) => b.price - a.price);
}

function chartTime(date: string) {
  if (date.length <= 10) {
    const [year, month, day] = date.split("-").map(Number);
    return { year, month, day };
  }
  return Math.floor(new Date(date).getTime() / 1000);
}

function CandleChart({ rows, levels }: { rows: PriceRow[]; levels: Level[] }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let chart: IChartApi | undefined;
    let ro: ResizeObserver | undefined;
    let disposed = false;

    async function setup() {
      const { createChart, ColorType, CandlestickSeries, HistogramSeries } = await import("lightweight-charts");
      if (disposed || !ref.current) return;

      chart = createChart(ref.current, {
        width: ref.current.clientWidth,
        height: ref.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: "#0b0f19" },
          textColor: "#d1d5db",
          fontSize: 13,
        },
        grid: {
          vertLines: { color: "rgba(148,163,184,0.16)" },
          horzLines: { color: "rgba(148,163,184,0.16)" },
        },
        rightPriceScale: {
          borderColor: "rgba(148,163,184,0.28)",
          scaleMargins: { top: 0.08, bottom: 0.24 },
        },
        timeScale: {
          borderColor: "rgba(148,163,184,0.28)",
          timeVisible: true,
          secondsVisible: false,
        },
        localization: {
          locale: "ja-JP",
          priceFormatter: (p: number) => Math.round(p).toLocaleString("ja-JP"),
        },
      });

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: "#22c55e",
        downColor: "#ef4444",
        borderUpColor: "#22c55e",
        borderDownColor: "#ef4444",
        wickUpColor: "#22c55e",
        wickDownColor: "#ef4444",
      });
      const volume = chart.addSeries(HistogramSeries, {
        priceScaleId: "",
        priceFormat: { type: "volume" },
      });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

      const candleRows = rows
        .filter((r) => r.Open != null && r.High != null && r.Low != null && r.Close != null)
        .map((r) => ({
          time: chartTime(r.date),
          open: r.Open!,
          high: r.High!,
          low: r.Low!,
          close: r.Close!,
        }));
      const volumeRows = rows
        .filter((r) => r.Volume != null && r.Open != null && r.Close != null)
        .map((r) => ({
          time: chartTime(r.date),
          value: r.Volume!,
          color: r.Close! >= r.Open! ? "rgba(34,197,94,0.38)" : "rgba(239,68,68,0.38)",
        }));

      candles.setData(candleRows);
      volume.setData(volumeRows);
      levels.forEach((level) => {
        candles.createPriceLine({
          price: level.price,
          color: levelColor(level.kind),
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${level.label} ${Math.round(level.price).toLocaleString("ja-JP")}`,
        });
      });
      chart.timeScale().fitContent();
      ro = new ResizeObserver(() => {
        if (ref.current && chart) {
          chart.applyOptions({
            width: ref.current.clientWidth,
            height: ref.current.clientHeight,
          });
        }
      });
      ro.observe(ref.current);
    }

    setup();
    return () => {
      disposed = true;
      ro?.disconnect();
      chart?.remove();
    };
  }, [rows, levels]);

  return <div ref={ref} className="h-[760px] w-full overflow-hidden rounded border border-border bg-[#0b0f19]" />;
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-border bg-card p-4 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-sans text-xl font-bold tabular-nums sm:text-2xl">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function PositionPanel({ position }: { position: Position }) {
  const [mode, setMode] = useState<"daily" | "intraday">("daily");
  const rows = mode === "daily" ? position.daily_rows : position.intraday_rows;
  const latest = position.daily_rows[position.daily_rows.length - 1];
  const sortedLevels = useMemo(() => uniqueLevels(position.levels), [position.levels]);

  return (
    <section className="rounded border border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{position.code} {position.name}</h2>
              <span className={`rounded border px-2 py-0.5 text-xs ${position.summary.hedged ? "border-amber-500/40 text-amber-300" : "border-muted text-muted-foreground"}`}>
                {position.summary.hedged ? "ヘッジ中" : "片建て"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{position.role}</p>
          </div>
          <div className="text-right">
            <div className={`font-sans text-2xl font-bold tabular-nums ${pnlClass(position.summary.total_pnl)}`}>
              {yen(position.summary.total_pnl)}
            </div>
            <div className="text-xs text-muted-foreground">実現 + 含み</div>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(390px,0.9fr)]">
          <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="text-sm text-muted-foreground">
              最新日足:
              <span className="ml-1 font-sans tabular-nums">O {num(latest?.Open)}</span>
              <span className="ml-2 font-sans tabular-nums">H {num(latest?.High)}</span>
              <span className="ml-2 font-sans tabular-nums">L {num(latest?.Low)}</span>
              <span className="ml-2 font-sans tabular-nums">C {num(latest?.Close)}</span>
            </div>
            <div className="flex rounded border border-border p-0.5">
              {(["daily", "intraday"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setMode(item)}
                  className={`px-3 py-1 text-xs ${mode === item ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                >
                  {item === "daily" ? "日足" : "5分足"}
                </button>
              ))}
            </div>
          </div>
          <CandleChart rows={rows} levels={sortedLevels} />
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="含み損益" value={yen(position.summary.net_unrealized)} sub={`買 ${yen(position.summary.long_unrealized)} / 売 ${yen(position.summary.short_unrealized)}`} />
            <SummaryCard label="実現損益" value={yen(position.summary.realized_total)} />
            <SummaryCard label="買建" value={`${num(position.summary.long_qty)}株`} />
            <SummaryCard label="売建" value={`${num(position.summary.short_qty)}株`} />
            </div>

            <div className="rounded border border-border bg-card p-4">
            <div className="mb-2 flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-4 w-4" />
              判断方針
            </div>
            <p className="text-sm text-muted-foreground">{position.stance}</p>
            <ul className="mt-3 space-y-2 text-sm">
              {position.rules.map((rule) => (
                <li key={rule} className="border-l border-border pl-3 text-muted-foreground">{rule}</li>
              ))}
            </ul>
            </div>

            <div className="rounded border border-border bg-card p-4">
            <div className="mb-3 text-lg font-semibold">節目</div>
            <div className="grid grid-cols-1 gap-2 2xl:grid-cols-2">
              {sortedLevels.map((level) => (
                <div
                  key={`${level.label}-${level.price}`}
                  className="grid grid-cols-[minmax(0,1fr)_7rem] items-center gap-3 rounded bg-muted/30 px-4 py-2 text-sm hover:bg-muted/50"
                >
                  <span className="truncate text-muted-foreground">{level.label}</span>
                  <span className="text-right font-sans tabular-nums">{num(level.price)}</span>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
          <div className="rounded border border-border bg-card p-4">
            <div className="mb-3 text-lg font-semibold">建玉</div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm md:text-base">
                <thead className="text-sm text-muted-foreground">
                  <tr>
                    <th className="border-b border-border/30 px-4 py-2 text-left font-semibold">売買</th>
                    <th className="border-b border-border/30 px-4 py-2 text-left font-semibold">信用</th>
                    <th className="border-b border-border/30 px-4 py-2 text-right font-semibold tabular-nums">数量</th>
                    <th className="border-b border-border/30 px-4 py-2 text-right font-semibold tabular-nums">建値</th>
                    <th className="border-b border-border/30 px-4 py-2 text-right font-semibold tabular-nums">時価</th>
                    <th className="border-b border-border/30 px-4 py-2 text-right font-semibold tabular-nums">損益</th>
                  </tr>
                </thead>
                <tbody>
                  {position.holdings.map((h, idx) => (
                    <tr key={`${h.direction}-${idx}`} className="hover:bg-muted/50">
                      <td className="border-b border-border/50 px-4 py-2">{h.direction}</td>
                      <td className="border-b border-border/50 px-4 py-2">{h.margin_type}</td>
                      <td className="border-b border-border/50 px-4 py-2 text-right font-sans tabular-nums">{num(h.quantity)}</td>
                      <td className="border-b border-border/50 px-4 py-2 text-right font-sans tabular-nums">{num(h.entry_price)}</td>
                      <td className="border-b border-border/50 px-4 py-2 text-right font-sans tabular-nums">{num(h.current_price)}</td>
                      <td className={`border-b border-border/50 px-4 py-2 text-right font-sans font-semibold tabular-nums ${pnlClass(h.unrealized_pnl)}`}>{yen(h.unrealized_pnl)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded border border-border bg-card p-4">
            <div className="mb-3 text-lg font-semibold">直近決済</div>
            <div className="space-y-1 text-sm md:text-base">
              {position.latest_trades.slice(0, 6).map((trade, idx) => (
                <div
                  key={`${trade.trade_date}-${idx}`}
                  className="grid grid-cols-[minmax(0,1fr)_8rem] items-center gap-3 border-b border-border/50 px-4 py-2 last:border-0 hover:bg-muted/50"
                >
                  <span className="truncate text-muted-foreground">{trade.trade_date} {trade.side}</span>
                  <span className={`text-right font-sans font-semibold tabular-nums ${pnlClass(trade.realized_pnl)}`}>{yen(trade.realized_pnl)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HedgePage() {
  const [data, setData] = useState<HedgePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/dev/hedge/positions`, { cache: "no-store" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Hedge Monitor</h1>
            <DevNavLinks />
          </div>
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw className="h-4 w-4" />
            更新
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[1800px] space-y-5 px-5 py-5">
        {loading && <div className="rounded border border-border bg-card p-6 text-muted-foreground">Loading...</div>}
        {error && <div className="rounded border border-rose-500/40 bg-rose-500/10 p-6 text-rose-300">{error}</div>}
        {data && (
          <>
            <section className="grid gap-3 md:grid-cols-4">
              <SummaryCard label="監視銘柄" value={`${data.portfolio.watch_count}`} />
              <SummaryCard label="含み損益" value={yen(data.portfolio.unrealized_pnl)} />
              <SummaryCard label="実現損益" value={yen(data.portfolio.realized_pnl)} />
              <SummaryCard label="合計損益" value={yen(data.portfolio.total_pnl)} />
            </section>

            <section className="rounded border border-border bg-card p-4">
              <div className="mb-2 flex items-center gap-2 font-medium">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                運用ルール
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {data.rules.map((rule) => (
                  <div key={rule} className="rounded bg-muted/30 p-3 text-sm text-muted-foreground">{rule}</div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              {data.positions.map((position) => (
                <PositionPanel key={position.ticker} position={position} />
              ))}
            </div>

            <footer className="flex items-center gap-2 pb-6 text-xs text-muted-foreground">
              <TrendingDown className="h-3.5 w-3.5" />
              更新: {new Date(data.as_of).toLocaleString("ja-JP")} / source: {Object.values(data.source).join(" / ")}
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
