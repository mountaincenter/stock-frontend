"use client";

import { useEffect, useState } from "react";

interface MarketSummaryResponse {
  report_metadata: {
    date: string;
    generated_at: string;
    prompt_version: string;
    word_count: number;
  };
  content: {
    title: string;
    markdown_full: string;
    sections: {
      indices?: string;
      sectors?: string;
      news?: string;
      trends?: string;
      indicators?: string;
    };
  };
}

interface MarketSummaryProps {
  date?: string;
  className?: string;
}

export default function MarketSummary({ date, className = "" }: MarketSummaryProps) {
  const [summary, setSummary] = useState<MarketSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    const url = date
      ? `${API_BASE}/market-summary/${date}`
      : `${API_BASE}/market-summary/latest`;

    setLoading(true);
    fetch(url)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("市場サマリーが見つかりません");
          throw new Error("Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setSummary(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [date]);

  const formatNumber = (numStr: string): string => {
    const match = numStr.match(/^([+\-±]?)\s*([0-9,\.]+)\s*([円%]?)$/);
    if (!match) return numStr;
    const [, sign, num, unit] = match;
    const cleanNum = num.replace(/,/g, "");

    if (unit === "円") {
      return `${sign}${parseFloat(cleanNum).toLocaleString("ja-JP")}円`;
    } else if (unit === "%") {
      return `${sign}${parseFloat(cleanNum).toFixed(2)}%`;
    } else {
      const hasDecimal = cleanNum.includes(".");
      return `${sign}${parseFloat(cleanNum).toLocaleString("ja-JP", {
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: hasDecimal ? 2 : 0,
      })}`;
    }
  };

  const renderMarkdown = (text: string, citationMap: { url: string; numbers: string }[]) => {
    if (!text) return "";

    const citationToUrl: Record<string, string> = {};
    citationMap.forEach(({ url, numbers }) => {
      numbers.split(",").forEach((num) => {
        citationToUrl[num.trim()] = url;
      });
    });

    // 出典リンク [出典N] をクリック可能に
    text = text.replace(/\[出典([\d,]+)\]/g, (_, numbers) => {
      const nums = numbers.split(",").map((n: string) => n.trim());
      const links = nums.map((num: string) => {
        const url = citationToUrl[num];
        return url
          ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline text-sm">[${num}]</a>`
          : `[${num}]`;
      });
      return links.join("");
    });

    // テーブル
    const tableRegex = /(\|[^\n]+\|\n)((?:\|[^\n]+\|\n?)+)/g;
    text = text.replace(tableRegex, (match) => {
      const rows = match.trim().split("\n");
      if (rows.length < 2) return match;

      const headerRow = rows[0];
      const dataRows = rows.slice(1).filter((r) => !r.includes("---"));

      let headers = headerRow.split("|").map((h) => h.trim()).filter((h) => h);
      const hasTickerColumn = headers.includes("ticker");

      headers = headers.map((h) => {
        if (h === "name" && hasTickerColumn) return "指数名";
        if (h === "name") return "セクター名";
        if (h === "close") return "終値";
        if (h === "change_pct") return "前日比";
        return h;
      });

      let html = '<div class="overflow-x-auto my-2"><table class="text-sm leading-[1.4]">';

      html += '<thead><tr class="border-b border-border/40">';
      headers.forEach((h, i) => {
        const align = i === 0 ? "text-left" : "text-right";
        html += `<th class="px-2 py-1.5 text-sm ${align} font-medium text-muted-foreground">${h}</th>`;
      });
      html += "</tr></thead>";

      html += "<tbody>";
      dataRows.forEach((row) => {
        const cells = row.split("|").map((c) => c.trim()).filter((c) => c);
        if (cells.length === 0) return;

        html += '<tr class="border-b border-border/30">';
        cells.forEach((cell, cidx) => {
          let formattedCell = cell;
          let colorClass = "text-foreground";
          const align = cidx === 0 ? "text-left" : "text-right";

          if (cell === "-" || cell === "—") {
            colorClass = "text-muted-foreground/50";
          } else if (cidx > 0 && (cell.includes("円") || cell.includes("%") || /^[+\-±]?[0-9,\.]+$/.test(cell))) {
            formattedCell = formatNumber(cell);
            const headerName = headers[cidx];
            if (headerName === "前日比" && !formattedCell.includes("%") && !formattedCell.includes("円")) {
              formattedCell += "%";
            }
            if (headerName === "前日比" || formattedCell.includes("%") || formattedCell.includes("円")) {
              const val = parseFloat(formattedCell.replace(/[^0-9.\-+]/g, ""));
              colorClass = formattedCell.includes("+") || (val > 0 && !formattedCell.includes("-"))
                ? "text-emerald-400 font-medium"
                : formattedCell.includes("-")
                ? "text-rose-400 font-medium"
                : "text-foreground";
            }
          }

          const isImpact = headers[cidx] === "市場への影響";
          html += `<td class="px-2 py-1.5 text-sm ${colorClass} ${align} ${isImpact ? "" : "whitespace-nowrap"}">${formattedCell}</td>`;
        });
        html += "</tr>";
      });
      html += "</tbody></table></div>";
      return html;
    });

    // 見出し（smベースで統一、太さと色で区別）
    text = text.replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-foreground mt-4 mb-1.5">$1</h4>');
    text = text.replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-primary mt-5 mb-2 pb-1 border-b border-border/40">$1</h3>');
    text = text.replace(/^# (.+)$/gm, '<h2 class="text-sm font-bold text-foreground mt-5 mb-2">$1</h2>');

    // 強調
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

    // リスト
    text = text.replace(/^- (.+)$/gm, '<li class="text-sm text-muted-foreground leading-[1.6] mb-1.5 pl-3 border-l-2 border-border/50 ml-1">$1</li>');

    // 段落
    text = text.replace(/\n\n+/g, '</p><p class="mb-2 text-sm leading-[1.6]">');
    text = '<p class="mb-2 text-sm leading-[1.6]">' + text + "</p>";
    text = text.replace(/\n/g, "<br/>");

    return text;
  };

  if (loading) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
        <div className="relative flex items-center justify-center h-20">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className={`relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 p-4 shadow-lg shadow-black/5 backdrop-blur-xl ${className}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />
        <p className="relative text-sm text-muted-foreground">{error || "市場サマリーを読み込めませんでした"}</p>
      </div>
    );
  }

  const { report_metadata, content } = summary;

  // 出典マップを構築
  const citationMap: { url: string; numbers: string }[] = [];
  const citationMatch = content.markdown_full.match(/## 出典\n\n([\s\S]+)$/);
  if (citationMatch) {
    const pattern = /\[出典([\d,]+)\]\s+(https?:\/\/[^\s]+)/g;
    let m;
    while ((m = pattern.exec(citationMatch[1])) !== null) {
      citationMap.push({ url: m[2], numbers: m[1] });
    }
  }

  // URLを収集して番号付き出典に変換
  const urlToNumber: Record<string, number> = {};
  let citationCounter = 1;

  // markdown_fullから出典セクションを除去してレンダリング
  let mainContent = content.markdown_full;
  // タイトル行を除去
  mainContent = mainContent.replace(/^# .+\n\n?/, "");
  // 出典セクションを除去
  mainContent = mainContent.replace(/\n---\n\n## 出典[\s\S]*$/, "");
  mainContent = mainContent.replace(/## 出典[\s\S]*$/, "");
  // ボラティリティセクションを除去（データ取得失敗の場合）
  mainContent = mainContent.replace(/## ボラティリティ\n\n日経VI: データ取得失敗[\s\S]*?(?=\n## |$)/, "");

  // インラインURL（括弧内）を[出典N]形式に変換
  mainContent = mainContent.replace(/（(https?:\/\/[^\s）]+(?:,\s*https?:\/\/[^\s）]+)*)）/g, (_, urls) => {
    const urlList = urls.split(/,\s*/);
    const nums = urlList.map((url: string) => {
      const trimmedUrl = url.trim();
      if (!urlToNumber[trimmedUrl]) {
        urlToNumber[trimmedUrl] = citationCounter++;
      }
      return urlToNumber[trimmedUrl];
    });
    return `[出典${nums.join(",")}]`;
  });
  mainContent = mainContent.replace(/\((https?:\/\/[^\s)]+(?:,\s*https?:\/\/[^\s)]+)*)\)/g, (_, urls) => {
    const urlList = urls.split(/,\s*/);
    const nums = urlList.map((url: string) => {
      const trimmedUrl = url.trim();
      if (!urlToNumber[trimmedUrl]) {
        urlToNumber[trimmedUrl] = citationCounter++;
      }
      return urlToNumber[trimmedUrl];
    });
    return `[出典${nums.join(",")}]`;
  });

  // 収集したURLから出典マップを更新
  Object.entries(urlToNumber).forEach(([url, num]) => {
    citationMap.push({ url, numbers: String(num) });
  });

  const renderedContent = renderMarkdown(mainContent, citationMap);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-card/50 via-card/80 to-card/50 shadow-lg shadow-black/5 backdrop-blur-xl ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] via-transparent to-transparent pointer-events-none" />

      {/* ヘッダー */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold text-foreground">市場サマリー</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono">{report_metadata.date}</span>
          <span className="px-1.5 py-0.5 rounded bg-muted/50 text-xs">{report_metadata.word_count.toLocaleString()}字</span>
        </div>
      </div>

      {/* 本文 - markdown_fullを直接レンダリング */}
      <div className="relative p-4">
        <div
          className="text-sm text-muted-foreground leading-[1.8] tracking-[0.02em] market-summary-content font-sans"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>

      {/* 出典 - 折りたたみ */}
      {citationMap.length > 0 && (
        <div className="relative px-4 py-3 border-t border-border/40 bg-muted/20">
          <details>
            <summary className="text-sm text-muted-foreground/70 cursor-pointer hover:text-muted-foreground list-none flex items-center gap-1">
              <span className="text-xs">▶</span>
              出典 ({citationMap.length})
            </summary>
            <div className="mt-2 space-y-1 text-sm">
              {(() => {
                const map: Record<string, number[]> = {};
                citationMap.forEach(({ url, numbers }) => {
                  const nums = numbers.split(",").map((n) => parseInt(n.trim()));
                  if (!map[url]) map[url] = [];
                  map[url].push(...nums);
                });
                Object.keys(map).forEach((url) => {
                  map[url] = [...new Set(map[url])].sort((a, b) => a - b);
                });
                return Object.entries(map)
                  .sort((a, b) => a[1][0] - b[1][0])
                  .map(([url, nums]) => (
                    <div key={url} className="text-muted-foreground/70 break-all leading-relaxed">
                      <span className="text-primary">[{nums.join(",")}]</span>{" "}
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline">
                        {url}
                      </a>
                    </div>
                  ));
              })()}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
