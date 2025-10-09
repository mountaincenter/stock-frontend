// components/stock_list_new/wrappers/TableWrapper.tsx
import React from "react";

export function TableWrapper({
  toolbar,
  children,
  /** モバイルは画面を極力使い切る。md以上は従来の高さ */
  heightClass,
  stretch = true,
}: {
  toolbar: React.ReactNode;
  children: React.ReactNode;
  heightClass?: string;
  stretch?: boolean;
}) {
  const resolvedHeightClass = stretch
    ? heightClass ?? "h-[calc(100vh-112px)] md:h-[70vh]"
    : heightClass ?? "h-auto";

  const containerClasses = [
    "relative",
    stretch ? "flex flex-col" : "",
    resolvedHeightClass,
    "rounded-none border-0 md:rounded-xl md:border md:border-border",
    stretch ? "overflow-hidden" : "overflow-visible",
  ]
    .filter(Boolean)
    .join(" ");

  const contentClasses = stretch
    ? "flex-1 min-h-0 overflow-y-auto overscroll-contain"
    : "overflow-visible";

  return (
    <div className={containerClasses}>
      <div className="sticky top-0 z-20 bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/70 border-b border-border">
        <div className="px-2 py-1 md:p-2">{toolbar}</div>
      </div>
      <div className={contentClasses}>{children}</div>
    </div>
  );
}
