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
          "w-full h-9 px-4 rounded-full",
          "border border-border/50 bg-card/60 backdrop-blur-sm",
          "text-sm text-muted-foreground/80 placeholder:text-muted-foreground/60",
          "shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary",
          "md:h-10 md:px-5",
        ].join(" ")}
      />
    </div>
  );
}
