// app/[ticker]/lib/chart-helpers.ts
import { UTCTimestamp, BusinessDay, TickMarkType, Time } from "lightweight-charts";
import type { RangeKey } from "../config/chartRangeConfig";

export function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function toUtcSeconds(t: string): number {
  // The backend returns timezone-naive datetime strings that are already in JST
  // e.g., "2025-10-24T09:00:00" means 9:00 AM JST
  // We need to convert this to a UTC timestamp that lightweight-charts can use

  let iso = t.trim();
  if (!iso.includes("T")) {
    iso = `${iso}T00:00:00`;
  } else {
    iso = iso.replace(" ", "T");
  }

  // Check if timezone info is already present
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);

  if (!hasTimezone) {
    // Append JST offset to treat the string as JST time
    iso = iso + '+09:00';
  }

  const date = new Date(iso);
  return Math.floor(date.getTime() / 1000);
}

// LWC時間フォーマッター
const dfDateOnly = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Tokyo",
});
const dfDateTime = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});
const dfDateTimeShort = new Intl.DateTimeFormat("ja-JP", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});
const dfTimeOnly = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});
const dfMonth = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  timeZone: "Asia/Tokyo",
});
const dfYear = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  timeZone: "Asia/Tokyo",
});

const toDate = (t: Time): Date => {
  if (typeof t === "number") {
    return new Date(t * 1000);
  }
  if (typeof t === "string") {
    const ts = toUtcSeconds(t) * 1000;
    return new Date(ts);
  }
  // BusinessDay should be treated as JST, not UTC
  return new Date(t.year, t.month - 1, t.day);
};

export function formatLwcTime(t: UTCTimestamp | BusinessDay): string {
  if (typeof t === "number") {
    const date = new Date(t * 1000);
    return dfDateTime.format(date);
  }
  const { year, month, day } = t;
  const date = new Date(Date.UTC(year, month - 1, day));
  return dfDateOnly.format(date);
}

export function formatTickLabel(time: Time, type: TickMarkType, rangeKey?: RangeKey): string {
  const date = toDate(time);

  if (rangeKey === "r_5d" || rangeKey === "r_1mo" || rangeKey === "r_3mo") {
    // Intraday ranges: show time only for 5min/15min/1hour intervals
    return dfTimeOnly.format(date);
  }

  switch (type) {
    case TickMarkType.Time:
      return dfDateTimeShort.format(date);
    case TickMarkType.DayOfMonth:
      return dfDateOnly.format(date);
    case TickMarkType.Month:
      return dfMonth.format(date);
    case TickMarkType.Year:
      return dfYear.format(date);
    default:
      return dfDateOnly.format(date);
  }
}
