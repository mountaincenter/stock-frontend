"use client";

import { useEffect, useMemo, useRef } from "react";
import type {
  BusinessDay,
  IChartApi,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import { toUtcSeconds } from "@/app/[ticker]/lib/chart-helpers";
import type {
  DailyBar,
  IntradayBar,
  TickTempoBar,
} from "./types";

const COLORS = {
  background: "#131722",
  panel: "#1e222d",
  grid: "#2a2e39",
  border: "#404551",
  text: "#a1a7b4",
  up: "#2ecc94",
  down: "#f06563",
  amber: "#f5a623",
  blue: "#4d8bff",
  purple: "#b388ff",
  cyan: "#31c5d8",
  muted: "#787d8a",
};

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
});

function formatIntradayTime(time: Time): string {
  if (typeof time === "number") {
    return timeFormatter.format(new Date(time * 1000));
  }
  if (typeof time === "string") {
    return time.slice(11, 16) || time;
  }
  const value = time as BusinessDay;
  return `${value.month}/${value.day}`;
}

function intradayTime(value: string): UTCTimestamp {
  return toUtcSeconds(value) as UTCTimestamp;
}

interface DailyReplayChartProps {
  rows: DailyBar[];
}

export function DailyReplayChart({ rows }: DailyReplayChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const prepared = useMemo(
    () => ({
      candles: rows.map((row) => ({
        time: row.date as Time,
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
      })),
      volume: rows.map((row) => ({
        time: row.date as Time,
        value: row.volume,
        color: row.close >= row.open ? `${COLORS.up}70` : `${COLORS.down}70`,
      })),
      sma25: rows
        .filter((row) => row.sma25 !== null)
        .map((row) => ({ time: row.date as Time, value: row.sma25! })),
      sma75: rows
        .filter((row) => row.sma75 !== null)
        .map((row) => ({ time: row.date as Time, value: row.sma75! })),
      sma200: rows
        .filter((row) => row.sma200 !== null)
        .map((row) => ({ time: row.date as Time, value: row.sma200! })),
    }),
    [rows],
  );

  useEffect(() => {
    if (!containerRef.current || prepared.candles.length === 0) return;

    let chart: IChartApi | null = null;
    let observer: ResizeObserver | null = null;
    let disposed = false;

    const setup = async () => {
      const {
        CandlestickSeries,
        ColorType,
        CrosshairMode,
        HistogramSeries,
        LineSeries,
        createChart,
      } = await import("lightweight-charts");
      if (disposed || !containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 460,
        layout: {
          background: { type: ColorType.Solid, color: COLORS.background },
          textColor: COLORS.text,
          panes: {
            separatorColor: COLORS.border,
            separatorHoverColor: COLORS.blue,
          },
        },
        grid: {
          vertLines: { color: COLORS.grid },
          horzLines: { color: COLORS.grid },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: {
          borderColor: COLORS.border,
          scaleMargins: { top: 0.08, bottom: 0.23 },
        },
        timeScale: {
          borderColor: COLORS.border,
          rightOffset: 4,
          barSpacing: 5,
        },
        handleScroll: true,
        handleScale: true,
      });

      const candles = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: COLORS.up,
        wickDownColor: COLORS.down,
      });
      candles.setData(prepared.candles);

      const addLine = (
        data: Array<{ time: Time; value: number }>,
        color: string,
        title: string,
      ) => {
        const series = chart!.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title,
        });
        series.setData(data);
      };
      addLine(prepared.sma25, COLORS.amber, "SMA25");
      addLine(prepared.sma75, COLORS.blue, "SMA75");
      addLine(prepared.sma200, COLORS.purple, "SMA200");

      const volume = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        lastValueVisible: false,
        priceLineVisible: false,
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
      volume.setData(prepared.volume);

      chart.timeScale().fitContent();
      observer = new ResizeObserver(() => {
        if (containerRef.current && chart) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      });
      observer.observe(containerRef.current);
    };

    void setup();
    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.remove();
    };
  }, [prepared]);

  return (
    <div className="relative overflow-hidden rounded-md border border-[#404551] bg-[#131722]">
      <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap gap-3 text-[11px] font-medium">
        <span className="text-[#e4e6eb]">日足</span>
        <span style={{ color: COLORS.amber }}>SMA25</span>
        <span style={{ color: COLORS.blue }}>SMA75</span>
        <span style={{ color: COLORS.purple }}>SMA200</span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

interface IntradayReplayChartsProps {
  rows: IntradayBar[];
  tempo: TickTempoBar[];
  cutoff: string;
  previousClose?: number;
  revealed?: boolean;
  entryPrice?: number;
}

export function IntradayReplayCharts({
  rows,
  tempo,
  cutoff,
  previousClose,
  revealed = false,
  entryPrice,
}: IntradayReplayChartsProps) {
  const priceRef = useRef<HTMLDivElement>(null);
  const tempoRef = useRef<HTMLDivElement>(null);

  const prepared = useMemo(() => {
    let previousTickPrice: number | null = null;
    return {
      candles: rows.map((row) => ({
        time: intradayTime(row.datetime),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
      })),
      volume: rows.map((row) => ({
        time: intradayTime(row.datetime),
        value: row.volume,
        color: row.close >= row.open ? `${COLORS.up}70` : `${COLORS.down}70`,
      })),
      vwap: rows
        .filter((row) => row.vwap !== null)
        .map((row) => ({
          time: intradayTime(row.datetime),
          value: row.vwap!,
        })),
      sma5: rows
        .filter((row) => row.sma5 !== null)
        .map((row) => ({
          time: intradayTime(row.datetime),
          value: row.sma5!,
        })),
      sma20: rows
        .filter((row) => row.sma20 !== null)
        .map((row) => ({
          time: intradayTime(row.datetime),
          value: row.sma20!,
        })),
      tempo: tempo.map((row) => {
        const up = previousTickPrice === null || row.price >= previousTickPrice;
        previousTickPrice = row.price;
        return {
          time: intradayTime(row.datetime),
          value: row.trades,
          color: up ? `${COLORS.up}c0` : `${COLORS.down}c0`,
        };
      }),
    };
  }, [rows, tempo]);

  useEffect(() => {
    if (
      !priceRef.current ||
      !tempoRef.current ||
      prepared.candles.length === 0
    ) {
      return;
    }

    let priceChart: IChartApi | null = null;
    let tempoChart: IChartApi | null = null;
    let observer: ResizeObserver | null = null;
    let disposed = false;

    const setup = async () => {
      const {
        CandlestickSeries,
        ColorType,
        CrosshairMode,
        HistogramSeries,
        LineSeries,
        createChart,
      } = await import("lightweight-charts");
      if (disposed || !priceRef.current || !tempoRef.current) return;

      const common = {
        layout: {
          background: { type: ColorType.Solid, color: COLORS.background },
          textColor: COLORS.text,
        },
        grid: {
          vertLines: { color: COLORS.grid },
          horzLines: { color: COLORS.grid },
        },
        crosshair: { mode: CrosshairMode.Normal },
        handleScroll: true,
        handleScale: true,
      };

      priceChart = createChart(priceRef.current, {
        ...common,
        width: priceRef.current.clientWidth,
        height: 430,
        rightPriceScale: {
          borderColor: COLORS.border,
          scaleMargins: { top: 0.08, bottom: 0.23 },
        },
        timeScale: {
          borderColor: COLORS.border,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 3,
          tickMarkFormatter: formatIntradayTime,
        },
        localization: { timeFormatter: formatIntradayTime },
      });

      const candles = priceChart.addSeries(CandlestickSeries, {
        upColor: COLORS.up,
        downColor: COLORS.down,
        borderUpColor: COLORS.up,
        borderDownColor: COLORS.down,
        wickUpColor: COLORS.up,
        wickDownColor: COLORS.down,
      });
      candles.setData(prepared.candles);

      if (previousClose !== undefined) {
        candles.createPriceLine({
          price: previousClose,
          color: COLORS.muted,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "前日終値",
        });
      }
      if (entryPrice !== undefined) {
        candles.createPriceLine({
          price: entryPrice,
          color: COLORS.cyan,
          lineWidth: 2,
          lineStyle: 1,
          axisLabelVisible: true,
          title: "ENTRY",
        });
      }

      const addLine = (
        data: Array<{ time: UTCTimestamp; value: number }>,
        color: string,
        title: string,
        lineWidth: 1 | 2 = 1,
      ) => {
        const series = priceChart!.addSeries(LineSeries, {
          color,
          lineWidth,
          priceLineVisible: false,
          lastValueVisible: true,
          title,
        });
        series.setData(data);
      };
      addLine(prepared.vwap, COLORS.amber, "VWAP", 2);
      addLine(prepared.sma5, COLORS.cyan, "SMA5");
      addLine(prepared.sma20, COLORS.blue, "SMA20", 2);

      const volume = priceChart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
        priceLineVisible: false,
        lastValueVisible: false,
      });
      volume.priceScale().applyOptions({
        scaleMargins: { top: 0.82, bottom: 0 },
      });
      volume.setData(prepared.volume);

      tempoChart = createChart(tempoRef.current, {
        ...common,
        width: tempoRef.current.clientWidth,
        height: 160,
        rightPriceScale: { borderColor: COLORS.border },
        timeScale: {
          borderColor: COLORS.border,
          timeVisible: true,
          secondsVisible: false,
          rightOffset: 3,
          tickMarkFormatter: formatIntradayTime,
        },
        localization: { timeFormatter: formatIntradayTime },
      });
      const trades = tempoChart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceLineVisible: false,
        lastValueVisible: true,
        title: "30秒約定件数",
      });
      trades.setData(prepared.tempo);

      let syncing = false;
      priceChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (!range || !tempoChart || syncing) return;
        syncing = true;
        tempoChart.timeScale().setVisibleRange(range);
        syncing = false;
      });
      tempoChart.timeScale().subscribeVisibleTimeRangeChange((range) => {
        if (!range || !priceChart || syncing) return;
        syncing = true;
        priceChart.timeScale().setVisibleRange(range);
        syncing = false;
      });

      priceChart.timeScale().fitContent();
      tempoChart.timeScale().fitContent();
      observer = new ResizeObserver(() => {
        if (priceRef.current && priceChart) {
          priceChart.applyOptions({ width: priceRef.current.clientWidth });
        }
        if (tempoRef.current && tempoChart) {
          tempoChart.applyOptions({ width: tempoRef.current.clientWidth });
        }
      });
      observer.observe(priceRef.current);
      observer.observe(tempoRef.current);
    };

    void setup();
    return () => {
      disposed = true;
      observer?.disconnect();
      priceChart?.remove();
      tempoChart?.remove();
    };
  }, [entryPrice, prepared, previousClose]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border border-[#404551] bg-[#131722]">
        <div className="pointer-events-none absolute left-3 top-2 z-10 flex flex-wrap gap-3 text-[11px] font-medium">
          <span className="text-[#e4e6eb]">
            1分足 {revealed ? "全時間" : `${cutoff}まで`}
          </span>
          <span style={{ color: COLORS.amber }}>VWAP</span>
          <span style={{ color: COLORS.cyan }}>SMA5</span>
          <span style={{ color: COLORS.blue }}>SMA20</span>
        </div>
        <div ref={priceRef} className="w-full" />
      </div>
      <div className="relative overflow-hidden rounded-md border border-[#404551] bg-[#131722]">
        <div className="pointer-events-none absolute left-3 top-2 z-10 text-[11px] font-medium text-[#e4e6eb]">
          tick由来・30秒約定テンポ
        </div>
        <div ref={tempoRef} className="w-full" />
      </div>
    </div>
  );
}
