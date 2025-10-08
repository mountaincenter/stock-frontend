// app/[ticker]/config/chartRangeConfig.ts
import { fmtDate } from '../lib/chart-helpers';

export type RangeKey =
  | "r_5d"
  | "r_1mo"
  | "r_3mo"
  | "r_ytd"
  | "r_1y"
  | "r_3y"
  | "r_5y"
  | "r_all";

export type RangeConfig = {
  period: string;
  interval: string;
  label: string;
  isIntraday: boolean; // 時間足フラグ
  getStart: (today: Date) => string | undefined;
  getEnd?: (today: Date) => string; // 時間足用の終了時刻
};

export const rangeConfigs: Record<RangeKey, RangeConfig> = {
  r_5d: {
    period: "60d",
    interval: "5m",
    label: "1日（5分足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 1);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_1mo: {
    period: "60d",
    interval: "15m",
    label: "5日（15分足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 5);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_3mo: {
    period: "730d",
    interval: "1h",
    label: "1ヶ月（1時間足）",
    isIntraday: true,
    getStart: (today) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 1);
      return fmtDate(d);
    },
    getEnd: (today) => {
      return fmtDate(today);
    },
  },
  r_ytd: {
    period: "max",
    interval: "1d",
    label: "6ヶ月（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setMonth(d.getMonth() - 6);
      return fmtDate(d);
    },
  },
  r_1y: {
    period: "max",
    interval: "1d",
    label: "年初来（日足）",
    isIntraday: false,
    getStart: (today) => {
      return fmtDate(new Date(today.getFullYear(), 0, 1));
    },
  },
  r_3y: {
    period: "max",
    interval: "1d",
    label: "1年（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 1);
      return fmtDate(d);
    },
  },
  r_5y: {
    period: "max",
    interval: "1d",
    label: "5年（日足）",
    isIntraday: false,
    getStart: (today) => {
      const d = new Date(today);
      d.setFullYear(d.getFullYear() - 5);
      return fmtDate(d);
    },
  },
  r_all: {
    period: "max",
    interval: "1d",
    label: "全期間（日足）",
    isIntraday: false,
    getStart: () => undefined, // 全期間 = startなし
  },
};
