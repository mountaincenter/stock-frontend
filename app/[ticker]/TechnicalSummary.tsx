"use client";

import React from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/* ---------- types (strict, no any) ---------- */
// v2: 5段階
type Rating5 = "強い買い" | "買い" | "中立" | "売り" | "強い売り";
// UI: 3段階（ゲージ表示用）
type Rating3 = "買い" | "中立" | "売り";

type VoteEntry = { score: number; label: Rating5 };
type TechDecisionVotes = Record<string, VoteEntry>;

type TechDecisionItem = {
  ticker: string;
  date: string; // YYYY-MM-DD
  votes: TechDecisionVotes; // keys: "tech","ma","ichimoku", "rsi14", "macd_hist", "percent_b", "roc12", "obv_slope", "cmf", など
  overall: VoteEntry;
};

type LegacyRatingLabel = "強い買い" | "買い" | "中立" | "売り" | "強い売り";
type LegacyRow = {
  ticker: string;
  stock_name: string;
  code: string;
  date: string | null;
  overall_rating: LegacyRatingLabel;
  tech_rating: LegacyRatingLabel;
  ma_rating: LegacyRatingLabel;
  ichimoku_rating: LegacyRatingLabel;
};

type Counts3 = { sell: number; neutral: number; buy: number };

/* ---------- helpers ---------- */
const fiveToThree = (label: Rating5): Rating3 => {
  if (label === "強い買い" || label === "買い") return "買い";
  if (label === "強い売り" || label === "売り") return "売り";
  return "中立";
};

const toScore = (label: Rating3): -1 | 0 | 1 =>
  label === "買い" ? 1 : label === "売り" ? -1 : 0;

const angleFromScore = (s: number) => s * 90;

const centerTone = (label: Rating3 | "—") => {
  switch (label) {
    case "買い":
      return "fill-[#089981]";
    case "売り":
      return "fill-[#f6465d]";
    default:
      return "fill-[#787b86]";
  }
};

const v3 = (n?: number) => (typeof n === "number" ? String(n) : "—");

// オシレーターの内訳としてカウントするキー（v2 の votes から集計）
const OSC_KEYS: ReadonlyArray<string> = [
  "rsi14",
  "macd_hist",
  "percent_b",
  "roc12",
  "obv_slope",
  "cmf",
  // 必要になったら追加（※ サーバ側にキーが存在しない場合は無視されます）
];

/* ---------- data fetch（v2優先 / legacy fallback） ---------- */
async function fetchDecision(ticker: string): Promise<TechDecisionItem | null> {
  if (!API_BASE) return null;
  try {
    const r = await fetch(
      `${API_BASE}/core30/tech/decision?ticker=${encodeURIComponent(ticker)}`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const data = (await r.json()) as TechDecisionItem | null;
    // 最低限の構造チェック
    if (
      !data ||
      typeof data.ticker !== "string" ||
      !data.votes ||
      !data.overall
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function fetchLegacyRow(ticker: string): Promise<LegacyRow | null> {
  if (!API_BASE) return null;
  try {
    const r = await fetch(`${API_BASE}/core30/tech/decision/snapshot`, {
      cache: "no-store",
    });
    if (!r.ok) return null;
    const all = (await r.json()) as LegacyRow[];
    return all.find((x) => x.ticker === ticker) ?? null;
  } catch {
    return null;
  }
}

/* ---------- Gauge ---------- */
function Gauge({
  label,
  counts,
}: {
  title: string;
  label: Rating3 | "—";
  counts?: Counts3;
}) {
  const W = 360,
    H = 168,
    CX = W / 2,
    CY = 114,
    R = 108;
  const score = label === "—" ? 0 : toScore(label);
  const deg = angleFromScore(score);

  const p = (r: number, d: number) => {
    const rad = (Math.PI / 180) * (d - 90);
    return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
  };
  const arc = (r: number, a0: number, a1: number) => {
    const s = p(r, a0),
      e = p(r, a1);
    return `M ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[168px]">
        <defs>
          <linearGradient id="tv-gauge" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f6465d" />
            <stop offset="50%" stopColor="#787b86" />
            <stop offset="100%" stopColor="#089981" />
          </linearGradient>
        </defs>

        {/* 背景アーク */}
        <path
          d={arc(R, -90, 90)}
          stroke="#2a2e39"
          strokeWidth={12}
          fill="none"
        />
        {/* カラーアーク */}
        <path
          d={arc(R, -90, 90)}
          stroke="url(#tv-gauge)"
          strokeWidth={12}
          fill="none"
        />

        {/* 針 */}
        <g
          transform={`rotate(${deg} ${CX} ${CY})`}
          className="transition-transform duration-500"
        >
          <line
            x1={CX}
            y1={CY}
            x2={CX}
            y2={CY - R + 8}
            stroke="black"
            strokeWidth={3}
          />
          <circle cx={CX} cy={CY} r={4} fill="black" />
        </g>

        {/* 中央ラベル */}
        <text
          x={CX}
          y={CY + 36}
          textAnchor="middle"
          className={`text-base font-extrabold ${centerTone(label)}`}
        >
          {label}
        </text>
      </svg>

      {/* 凡例 */}
      {counts && (
        <div className="mt-2 grid grid-cols-3 text-sm font-semibold">
          <div className="text-[#f6465d] text-left">売り {v3(counts.sell)}</div>
          <div className="text-[#787b86] text-center">
            中立 {v3(counts.neutral)}
          </div>
          <div className="text-[#089981] text-right">買い {v3(counts.buy)}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- TechnicalSummary ---------- */
export default function TechnicalSummary({ ticker }: { ticker: string }) {
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [item, setItem] = React.useState<TechDecisionItem | null>(null);
  const [legacy, setLegacy] = React.useState<LegacyRow | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setStatus("loading");
        const v2 = await fetchDecision(ticker);
        const legacyRow = v2 ? null : await fetchLegacyRow(ticker);
        if (alive) {
          setItem(v2);
          setLegacy(legacyRow);
          setStatus("success");
        }
      } catch {
        if (alive) setStatus("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [ticker]);

  if (status === "loading") {
    return (
      <section className="w-full">
        <div className="text-sm font-medium text-muted-foreground/80 mb-3">
          テクニカル
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-full h-[180px] rounded-md bg-muted/10 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <div className="text-destructive text-sm font-medium">
        テクニカルの取得に失敗しました。
      </div>
    );
  }

  // 表示用 3段階ラベルを決定（v2 優先 / legacy フォールバック）
  const overall3: Rating3 | "—" = item?.overall?.label
    ? fiveToThree(item.overall.label)
    : legacy
    ? fiveToThree(legacy.overall_rating)
    : "—";

  const osc3: Rating3 | "—" = item?.votes?.tech?.label
    ? fiveToThree(item.votes.tech.label)
    : legacy
    ? fiveToThree(legacy.tech_rating)
    : "—";

  const ma3: Rating3 | "—" = item?.votes?.ma?.label
    ? fiveToThree(item.votes.ma.label)
    : legacy
    ? fiveToThree(legacy.ma_rating)
    : "—";

  // カウント（v2 の votes から集計。なければ undefined）
  const oscCounts: Counts3 | undefined = item
    ? (() => {
        let buy = 0,
          neutral = 0,
          sell = 0;
        OSC_KEYS.forEach((k) => {
          const v = item.votes[k];
          if (!v) return;
          const t = fiveToThree(v.label);
          if (t === "買い") buy += 1;
          else if (t === "売り") sell += 1;
          else neutral += 1;
        });
        return buy + neutral + sell > 0 ? { buy, neutral, sell } : undefined;
      })()
    : undefined;

  // MA 側は votes.ma の単票しか現状ないため、カウントは省略（将来: 複数MAを追加したら集計）
  const maCounts: Counts3 | undefined = undefined;

  const gauges: Array<{
    key: string;
    title: string;
    label: Rating3 | "—";
    counts?: Counts3;
  }> = [
    { key: "osc", title: "オシレーター", label: osc3, counts: oscCounts },
    { key: "sum", title: "サマリー", label: overall3 },
    { key: "ma", title: "移動平均", label: ma3, counts: maCounts },
  ];

  return (
    <section className="w-full">
      <div className="text-sm font-medium text-muted-foreground/80 mb-3">
        テクニカル
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {gauges.map((g) => (
          <Gauge
            key={g.key}
            title={g.title}
            label={g.label}
            counts={g.counts}
          />
        ))}
      </div>
    </section>
  );
}
