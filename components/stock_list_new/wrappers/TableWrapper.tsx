// components/stock_list_new/wrappers/TableWrapper.tsx
import React from "react";

export function TableWrapper({
  toolbar,
  children,
  /** モバイルは画面を極力使い切る。md以上は従来の高さ */
  heightClass = "h-[calc(100vh-112px)] md:h-[70vh]",
}: {
  toolbar: React.ReactNode;
  children: React.ReactNode;
  heightClass?: string;
}) {
  return (
    <div
      className={[
        "relative flex flex-col",
        heightClass,
        // モバイルは枠線・角丸を削ってフルブリード、md+ は従来どおり
        "rounded-none border-0 md:rounded-xl md:border md:border-border",
        "overflow-hidden",
      ].join(" ")}
    >
      {/* ツールバー（sticky / モバイルは超省スペース） */}
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-b border-border">
        <div className="px-2 py-1 md:p-2">{toolbar}</div>
      </div>

      {/* 内容。flex-1 + min-h-0 で“高さ計算”無しに安全スクロール */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
