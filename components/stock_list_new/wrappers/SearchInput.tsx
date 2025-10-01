// components/stock_list_new/wrappers/SearchInput.tsx
"use client";

import React from "react";

export function SearchInput({
  value,
  onChange,
  placeholder = "銘柄名/コード/ティッカーで検索",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={[
          // モバイルは詰める、md+は従来
          "w-full h-9 px-3 rounded-md",
          "bg-slate-900/60 border border-slate-700/60",
          "text-white placeholder-slate-500",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40",
          "md:h-12 md:px-4 md:rounded-xl md:bg-slate-800/50 md:border-slate-600/50 md:placeholder-slate-400",
        ].join(" ")}
      />
    </div>
  );
}
