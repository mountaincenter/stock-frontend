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
    "relative group",
    stretch ? "flex flex-col" : "",
    resolvedHeightClass,
    "rounded-none border-0 md:rounded-2xl md:border md:border-border/40",
    "md:bg-gradient-to-br md:from-card/60 md:via-card/80 md:to-card/60",
    "md:shadow-2xl md:shadow-black/5 md:backdrop-blur-xl",
    stretch ? "overflow-hidden" : "overflow-visible",
  ]
    .filter(Boolean)
    .join(" ");

  const contentClasses = stretch
    ? "flex-1 min-h-0 overflow-y-auto overscroll-contain"
    : "overflow-visible";

  return (
    <div className={containerClasses}>
      {/* Premium shine overlay for desktop */}
      <div className="hidden md:block absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none rounded-2xl" />

      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 border-b border-border/40">
        <div className="px-2 py-2 md:p-3">{toolbar}</div>
      </div>
      <div className={contentClasses}>{children}</div>
    </div>
  );
}
