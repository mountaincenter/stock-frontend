// app/[ticker]/AnnouncementBadge.tsx
"use client";

import * as React from "react";

interface AnnouncementData {
  ticker: string;
  announcementDate: string | null;
  nextQuarter: string | null;
  confidence: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// 次の四半期を取得
function getNextQuarter(current: string): string {
  const map: Record<string, string> = {
    "1Q": "2Q",
    "2Q": "3Q",
    "3Q": "FY",
    "FY": "1Q",
  };
  return map[current] ?? "FY";
}

// 次の四半期の概算発表月を取得
function getNextQuarterMonth(nextQuarter: string): string {
  const map: Record<string, string> = {
    "1Q": "8月",
    "2Q": "11月",
    "3Q": "2月",
    "FY": "5月",
  };
  return map[nextQuarter] ?? "";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

// 営業日を計算（土日を除く）
function getBusinessDays(fromDate: Date, toDate: Date): number {
  let count = 0;
  const current = new Date(fromDate);
  current.setHours(0, 0, 0, 0);
  const target = new Date(toDate);
  target.setHours(0, 0, 0, 0);

  const direction = target > current ? 1 : -1;

  while (
    direction > 0 ? current < target : current > target
  ) {
    current.setDate(current.getDate() + direction);
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count += direction;
    }
  }
  return count;
}

type BadgeState = "before" | "imminent" | "just_passed" | "next_quarter";

function getBadgeState(announcementDate: string): { state: BadgeState; businessDays: number } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(announcementDate);
  target.setHours(0, 0, 0, 0);

  const businessDays = getBusinessDays(today, target);

  if (businessDays > 5) {
    // 5営業日以上前
    return { state: "before", businessDays };
  } else if (businessDays >= 0) {
    // 5営業日以内〜当日
    return { state: "imminent", businessDays };
  } else if (businessDays >= -5) {
    // 発表後5営業日以内
    return { state: "just_passed", businessDays };
  } else {
    // 発表後5営業日経過
    return { state: "next_quarter", businessDays };
  }
}

export default function AnnouncementBadge({ ticker }: { ticker: string }) {
  const [data, setData] = React.useState<AnnouncementData | null>(null);

  React.useEffect(() => {
    async function fetchAnnouncement() {
      try {
        const url = API_BASE
          ? `${API_BASE}/fins/announcement/${ticker}`
          : `/api/fins/announcement/${ticker}`;
        const res = await fetch(url);
        if (!res.ok) return;
        const json = await res.json();
        setData(json);
      } catch {
        // silently fail
      }
    }
    fetchAnnouncement();
  }, [ticker]);

  if (!data?.announcementDate || !data?.nextQuarter) return null;

  const { state, businessDays } = getBadgeState(data.announcementDate);

  // スタイルと表示内容を状態に応じて設定
  let bgColor: string;
  let content: React.ReactNode;

  switch (state) {
    case "before":
      // 5営業日以上前: 通常表示
      bgColor = "bg-muted/50 border-border/40 text-muted-foreground";
      content = (
        <>
          {data.nextQuarter} 決算 {formatDate(data.announcementDate)}
        </>
      );
      break;

    case "imminent":
      // 5営業日以内〜当日: 警告色（決算前リスク）
      bgColor = "bg-amber-500/20 border-amber-500/50 text-amber-300";
      content = (
        <>
          {data.nextQuarter} 決算 {formatDate(data.announcementDate)}
          <span className="ml-1 font-bold">
            {businessDays === 0 ? "(本日)" : `(${businessDays}営業日後)`}
          </span>
        </>
      );
      break;

    case "just_passed":
      // 発表後5営業日以内: 注意色（決算後まだ注意）
      bgColor = "bg-sky-500/20 border-sky-500/50 text-sky-300";
      content = (
        <>
          {data.nextQuarter} 発表済
          <span className="ml-1 text-sky-400/70">
            ({Math.abs(businessDays)}営業日経過)
          </span>
        </>
      );
      break;

    case "next_quarter":
      // 5営業日経過: 次の四半期表示
      const nextQ = getNextQuarter(data.nextQuarter);
      const nextMonth = getNextQuarterMonth(nextQ);
      bgColor = "bg-muted/50 border-border/40 text-muted-foreground";
      content = (
        <>
          {nextQ === "FY" ? "本決算" : nextQ} {nextMonth}予定
        </>
      );
      break;
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${bgColor}`}
    >
      <svg
        className="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span>{content}</span>
    </div>
  );
}
