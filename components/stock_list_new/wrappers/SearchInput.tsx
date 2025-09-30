// components/stock_list/SearchInput.tsx
import React from "react";

export function SearchInput({
  value,
  onChange,
  placeholder = "銘柄名、コードで検索…（ティッカーも検索対象）",
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
        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 backdrop-blur-sm"
      />
    </div>
  );
}
