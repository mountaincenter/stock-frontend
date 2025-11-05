"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, AlertCircle, Newspaper, FileText } from "lucide-react";

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
  date?: string; // 指定しない場合は最新を取得
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
          if (res.status === 404) {
            throw new Error("市場サマリーが見つかりません");
          }
          throw new Error("Failed to fetch market summary");
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

  // No need to extract - we'll display markdown tables directly
  const extractMarketData = () => {
    return null; // Disable card extraction
  };

  // Helper: Format numbers with proper separators and decimals
  const formatNumber = (numStr: string): string => {
    // Extract sign, number, and unit
    const match = numStr.match(/^([+\-±]?)\s*([0-9,\.]+)\s*([円%]?)$/);
    if (!match) return numStr;

    const [, sign, num, unit] = match;
    const cleanNum = num.replace(/,/g, '');

    if (unit === '円') {
      // Currency: ±#,###円
      const formatted = parseFloat(cleanNum).toLocaleString('ja-JP', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
      return `${sign}${formatted}円`;
    } else if (unit === '%') {
      // Percentage: ±##.##%
      const formatted = parseFloat(cleanNum).toFixed(2);
      return `${sign}${formatted}%`;
    } else {
      // Index values: #,###.##
      const hasDecimal = cleanNum.includes('.');
      const formatted = parseFloat(cleanNum).toLocaleString('ja-JP', {
        minimumFractionDigits: hasDecimal ? 2 : 0,
        maximumFractionDigits: hasDecimal ? 2 : 0
      });
      return `${sign}${formatted}`;
    }
  };

  // Simple markdown-to-HTML converter for basic formatting
  const renderMarkdown = (text: string, citationMap: { url: string; numbers: string }[]) => {
    if (!text) return "";

    // Build URL lookup by citation number
    const citationToUrl: Record<string, string> = {};
    citationMap.forEach(({ url, numbers }) => {
      numbers.split(',').forEach(num => {
        citationToUrl[num.trim()] = url;
      });
    });

    // Replace [出典N] or [出典N,M,...] with clickable links
    text = text.replace(/\[出典([\d,]+)\]/g, (match, numbers) => {
      const nums = numbers.split(',').map((n: string) => n.trim());
      const links = nums.map((num: string) => {
        const url = citationToUrl[num];
        if (url) {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 text-xs no-underline font-semibold">[出典${num}]</a>`;
        }
        return `[出典${num}]`;
      });
      return links.join('');
    });

    // Convert markdown tables to HTML tables
    // Match table rows (| col1 | col2 | ...)
    const tableRegex = /(\|[^\n]+\|\n)((?:\|[^\n]+\|\n?)+)/g;
    text = text.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;

      // Skip separator row (|---|---|)
      const headerRow = rows[0];
      const dataRows = rows.slice(1).filter(r => !r.includes('---'));

      let html = '<div class="overflow-x-auto my-3 flex justify-start"><table class="text-sm border-collapse" style="width: auto; max-width: 100%;">';

      // Header
      let headers = headerRow.split('|').map(h => h.trim()).filter(h => h);

      // Detect table type and translate headers
      const isIndicatorTable = headers.some(h => h === '時刻(JST)' || h === '日時');
      const hasTickerColumn = headers.includes('ticker');

      // Translate headers
      headers = headers.map(h => {
        if (h === 'name' && hasTickerColumn) return '指数名';
        if (h === 'name') return 'セクター名';
        if (h === 'close') return '終値';
        if (h === 'change_pct') return '前日比';
        return h;
      });

      html += '<thead class="bg-slate-800/60"><tr>';
      headers.forEach((h, hidx) => {
        // All headers center-aligned
        html += `<th class="px-4 py-2 text-center text-xs font-bold text-slate-300 border-b border-slate-600 whitespace-nowrap">${h}</th>`;
      });
      html += '</tr></thead>';

      // Body
      html += '<tbody>';
      dataRows.forEach((row, idx) => {
        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length === 0) return;

        html += `<tr class="border-b border-slate-800/30 hover:bg-slate-800/30 transition-colors ${idx % 2 === 0 ? 'bg-slate-800/10' : ''}">`;
        cells.forEach((cell, cidx) => {
          // Format numbers properly
          let formattedCell = cell;
          let align = 'text-left';
          let colorClass = 'text-slate-200';

          // Check if it's a dash (separator)
          if (cell === '-' || cell === '—' || cell === '－') {
            align = 'text-center';
            colorClass = 'text-slate-400';
          } else if (cidx > 0 && (cell.includes('円') || cell.includes('%') || /^[+\-±]?[0-9,\.]+$/.test(cell))) {
            // Format and right-align numbers
            formattedCell = formatNumber(cell);

            // Add % if missing for change_pct column
            const headerName = headers[cidx];
            if (headerName === '前日比' && !formattedCell.includes('%') && !formattedCell.includes('円')) {
              formattedCell = formattedCell + '%';
            }

            align = 'text-right';

            // Color code percentage and currency changes
            if (headerName === '前日比' || formattedCell.includes('%') || formattedCell.includes('円')) {
              colorClass = formattedCell.includes('+') || (parseFloat(formattedCell) > 0 && !formattedCell.includes('-')) ? 'text-green-400 font-bold' :
                          formattedCell.includes('-') ? 'text-red-400 font-bold' :
                          'text-slate-200';
            } else {
              colorClass = 'text-slate-200';
            }
          } else {
            // Text content - left-aligned
            align = 'text-left';
            colorClass = 'text-slate-200';
          }

          // Check if this is the "市場への影響" column
          const headerName = headers[cidx];
          const isImpactColumn = headerName === '市場への影響';
          const whiteSpace = isImpactColumn ? '' : 'whitespace-nowrap';
          const minWidth = isImpactColumn ? 'min-w-[300px]' : '';

          html += `<td class="px-4 py-2 ${colorClass} ${align} ${whiteSpace} ${minWidth}">${formattedCell}</td>`;
        });
        html += '</tr>';
      });
      html += '</tbody></table></div>';

      return html;
    });

    // Headers (larger font sizes)
    text = text.replace(/^### (.+)$/gm, '<h4 class="text-base font-semibold text-slate-100 mt-4 mb-2">$1</h4>');
    text = text.replace(/^## (.+)$/gm, '<h3 class="text-lg font-bold text-slate-100 mt-5 mb-3">$1</h3>');
    text = text.replace(/^# (.+)$/gm, '<h2 class="text-xl font-bold text-slate-100 mt-5 mb-3">$1</h2>');

    // Bold and italic
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>');
    text = text.replace(/\*([^*]+)\*/g, '<em class="italic text-slate-200">$1</em>');

    // Lists (larger text)
    text = text.replace(/^- (.+)$/gm, '<li class="ml-4 text-sm text-slate-200 leading-relaxed list-none mb-2">• $1</li>');

    // Paragraphs (convert double newlines to paragraph breaks)
    text = text.replace(/\n\n+/g, '</p><p class="mb-3">');
    text = '<p class="mb-3">' + text + '</p>';

    // Single line breaks within paragraphs
    text = text.replace(/\n/g, '<br/>');

    return text;
  };

  if (loading) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className={`bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50 ${className}`}>
        <div className="flex items-center gap-3 text-slate-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error || "市場サマリーを読み込めませんでした"}</p>
        </div>
      </div>
    );
  }

  const { report_metadata, content } = summary;

  // Extract URLs and their citation numbers from markdown_full's ## 出典 section
  const citationMap: { url: string; numbers: string }[] = [];

  const citationSectionMatch = content.markdown_full.match(/## 出典\n\n([\s\S]+)$/);
  if (citationSectionMatch) {
    const citationSection = citationSectionMatch[1];
    // Extract [出典N,M,...] URL patterns using exec() for better compatibility
    const urlPattern = /\[出典([\d,]+)\]\s+(https?:\/\/[^\s]+)/g;
    let match;
    while ((match = urlPattern.exec(citationSection)) !== null) {
      citationMap.push({ url: match[2], numbers: match[1] });
    }
  }

  // Pre-render all sections
  const renderedSections: Record<string, string> = {};
  const sectionOrder = ['indices', 'trends', 'sectors', 'news', 'indicators'] as const;

  sectionOrder.forEach(section => {
    const sectionContent = content.sections[section as keyof typeof content.sections];
    if (sectionContent) {
      const html = renderMarkdown(sectionContent, citationMap);
      renderedSections[section] = html;
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`bg-slate-900/50 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50 shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Newspaper className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-slate-200">市場サマリー</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Calendar className="w-3.5 h-3.5" />
          <span>{report_metadata.date}</span>
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
            {report_metadata.word_count}字
          </span>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        {/* Main Indices */}
        {renderedSections.indices && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/20">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-blue-400" />
              <h4 className="text-base font-bold text-slate-100">主要指数</h4>
            </div>
            <div
              className="text-sm text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedSections.indices }}
            />
          </div>
        )}

        {/* Trends Section */}
        {renderedSections.trends && (
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
            <h4 className="text-base font-bold text-slate-100 mb-3">全体トレンド</h4>
            <div
              className="text-sm text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedSections.trends }}
            />
          </div>
        )}

        {/* Sectors */}
        {renderedSections.sectors && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/20">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-purple-400" />
              <h4 className="text-base font-bold text-slate-100">セクター動向</h4>
            </div>
            <div
              className="text-sm text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedSections.sectors }}
            />
          </div>
        )}

        {/* Key News Section */}
        {renderedSections.news && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/20">
            <div className="flex items-center gap-2 mb-3">
              <Newspaper className="w-4 h-4 text-green-400" />
              <h4 className="text-base font-bold text-slate-100">注目ニュース</h4>
            </div>
            <div
              className="text-sm text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedSections.news }}
            />
          </div>
        )}

        {/* Economic Indicators */}
        {renderedSections.indicators && (
          <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-700/20">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-yellow-400" />
              <h4 className="text-base font-bold text-slate-100">経済指標予定</h4>
            </div>
            <div
              className="text-sm text-slate-200 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderedSections.indicators }}
            />
          </div>
        )}
      </div>

      {/* Citation URLs List */}
      {citationMap.length > 0 && (
        <div className="mt-6 pt-4 border-t border-slate-700/30">
          <h4 className="text-sm font-bold text-slate-300 mb-3">出典URL一覧</h4>
          <div className="space-y-1.5">
            {(() => {
              // Group by URL: { url: [2, 3, 7, 12], ... }
              const urlToNumbers: Record<string, number[]> = {};
              citationMap.forEach(({ url, numbers }) => {
                const nums = numbers.split(',').map(n => parseInt(n.trim()));
                if (!urlToNumbers[url]) {
                  urlToNumbers[url] = [];
                }
                urlToNumbers[url].push(...nums);
              });

              // Sort numbers and remove duplicates for each URL
              Object.keys(urlToNumbers).forEach(url => {
                urlToNumbers[url] = Array.from(new Set(urlToNumbers[url])).sort((a, b) => a - b);
              });

              // Sort entries by first citation number
              const entries = Object.entries(urlToNumbers).sort((a, b) => a[1][0] - b[1][0]);

              return entries.map(([url, numbers]) => (
                <div key={url} className="text-xs text-slate-400 break-all">
                  <span className="text-blue-400 font-semibold">
                    [出典{numbers.join(',')}]
                  </span>
                  {' '}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-300 underline"
                  >
                    {url}
                  </a>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </motion.div>
  );
}
