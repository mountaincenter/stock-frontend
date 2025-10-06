import { UTCTimestamp, BusinessDay } from "lightweight-charts";

export const nfPrice = new Intl.NumberFormat("ja-JP", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

export const nfVolume = new Intl.NumberFormat("ja-JP", {
  useGrouping: true,
  maximumFractionDigits: 0,
});

const dfDateOnly = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const dfDateTime = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatLwcTime(t: UTCTimestamp | BusinessDay): string {
  if (typeof t === "number") {
    return dfDateTime.format(new Date(t * 1000));
  }
  const { year, month, day } = t;
  return dfDateOnly.format(new Date(year, month - 1, day));
}
