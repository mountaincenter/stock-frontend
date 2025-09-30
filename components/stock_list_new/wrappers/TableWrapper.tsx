import React from "react";

export function TableWrapper({
  toolbar,
  children,
  heightClass = "h-[70vh]",
}: {
  toolbar: React.ReactNode;
  children: React.ReactNode;
  heightClass?: string; // h-[60vh] 等に差し替え可能
}) {
  return (
    <div
      className={`${heightClass} min-h-[520px] rounded-xl border border-slate-700/40 overflow-hidden`}
    >
      <div className="sticky top-0 z-20 bg-slate-900/85 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-700/50">
        <div className="p-2">{toolbar}</div>
      </div>
      <div className="h-[calc(100%-56px)] overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
