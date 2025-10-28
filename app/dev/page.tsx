"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface OverallStats {
  total_trades: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  total_days: number;
}

interface DailyStats {
  date: string;
  total_stocks: number;
  valid_results: number;
  avg_return: number | null;
  win_rate: number | null;
  max_return: number | null;
  min_return: number | null;
  top5_avg_return: number | null;
  top5_win_rate: number | null;
}

interface BacktestSummary {
  overall: OverallStats;
  daily_stats: DailyStats[];
}

export default function DevDashboard() {
  const [data, setData] = useState<BacktestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://ymnk.jp/api/dev/backtest/summary")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Error: {error || "No data"}</div>
      </div>
    );
  }

  const { overall, daily_stats } = data;

  // Chart data (最新10日分)
  const recentStats = daily_stats.slice(0, 10).reverse();
  const chartLabels = recentStats.map((s) => {
    const d = new Date(s.date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const chartReturns = recentStats.map((s) => s.avg_return ?? 0);
  const chartWinRates = recentStats.map((s) => s.win_rate ?? 0);

  const lineChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "平均リターン (%)",
        data: chartReturns,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const barChartData = {
    labels: chartLabels,
    datasets: [
      {
        label: "勝率 (%)",
        data: chartWinRates,
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
      },
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "rgba(255, 255, 255, 0.7)" },
      },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        max: 100,
      },
    },
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 GROK Backtest Dashboard</h1>
          <p className="text-muted-foreground">Phase1戦略: 9:00寄付買い → 11:30前引け売り</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 shadow-lg">
            <div className="text-blue-200 text-sm font-medium mb-2">総取引数</div>
            <div className="text-3xl font-bold">{overall.total_trades}</div>
            <div className="text-blue-200 text-xs mt-2">{overall.total_days}営業日</div>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 shadow-lg">
            <div className="text-green-200 text-sm font-medium mb-2">平均リターン</div>
            <div className="text-3xl font-bold">
              {overall.avg_return !== null ? `${overall.avg_return >= 0 ? '+' : ''}${overall.avg_return.toFixed(2)}%` : "—"}
            </div>
            <div className="text-green-200 text-xs mt-2">全期間平均</div>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 shadow-lg">
            <div className="text-purple-200 text-sm font-medium mb-2">勝率</div>
            <div className="text-3xl font-bold">
              {overall.win_rate !== null ? `${overall.win_rate.toFixed(1)}%` : "—"}
            </div>
            <div className="text-purple-200 text-xs mt-2">プラス決済の割合</div>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-lg p-6 shadow-lg">
            <div className="text-orange-200 text-sm font-medium mb-2">最高/最低</div>
            <div className="text-xl font-bold">
              {overall.max_return !== null && overall.min_return !== null ? (
                <>
                  <span className="text-green-300">{overall.max_return >= 0 ? '+' : ''}{overall.max_return.toFixed(2)}%</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="text-red-300">{overall.min_return >= 0 ? '+' : ''}{overall.min_return.toFixed(2)}%</span>
                </>
              ) : "—"}
            </div>
            <div className="text-orange-200 text-xs mt-2">リターン範囲</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">📈 日次平均リターン</h2>
            <Line data={lineChartData} options={chartOptions} />
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg border border-border">
            <h2 className="text-xl font-semibold mb-4">🎯 日次勝率</h2>
            <Bar data={barChartData} options={barChartOptions} />
          </div>
        </div>

        {/* Recent Results Table */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">📅 最近のバックテスト結果</h2>
          <div className="bg-card rounded-lg shadow-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr className="text-muted-foreground text-sm">
                    <th className="px-4 py-3 text-left">日付</th>
                    <th className="px-4 py-3 text-right">取引数</th>
                    <th className="px-4 py-3 text-right">平均リターン</th>
                    <th className="px-4 py-3 text-right">勝率</th>
                    <th className="px-4 py-3 text-right">Top5平均</th>
                    <th className="px-4 py-3 text-right">Top5勝率</th>
                    <th className="px-4 py-3 text-right">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {daily_stats.slice(0, 10).map((stat) => (
                    <tr key={stat.date} className="border-b border-border hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{stat.date}</td>
                      <td className="px-4 py-3 text-sm text-right">{stat.valid_results}</td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        stat.avg_return !== null ? (stat.avg_return > 0 ? "text-green-500" : "text-red-500") : ""
                      }`}>
                        {stat.avg_return !== null ? `${stat.avg_return >= 0 ? '+' : ''}${stat.avg_return.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {stat.win_rate !== null ? `${stat.win_rate.toFixed(1)}%` : "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-bold ${
                        stat.top5_avg_return !== null ? (stat.top5_avg_return > 0 ? "text-green-500" : "text-red-500") : ""
                      }`}>
                        {stat.top5_avg_return !== null ? `${stat.top5_avg_return >= 0 ? '+' : ''}${stat.top5_avg_return.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {stat.top5_win_rate !== null ? `${stat.top5_win_rate.toFixed(1)}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dev/daily/${stat.date}`}
                          className="text-blue-500 hover:text-blue-400 text-sm"
                        >
                          詳細 →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-muted-foreground text-sm mt-12 pt-8 border-t border-border">
          <p>GROK Backtest Dashboard v1.0</p>
        </div>
      </div>
    </div>
  );
}
