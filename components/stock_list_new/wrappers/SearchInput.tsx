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
          // shadcn/ui のデフォルトトークンに統一
          "border border-input bg-background",
          "text-foreground placeholder:text-muted-foreground",
          "ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-ring",
          // md以降のサイズ/丸みだけ維持（色は共通トークンのまま）
          "md:h-12 md:px-4 md:rounded-xl",
        ].join(" ")}
      />
    </div>
  );
}
