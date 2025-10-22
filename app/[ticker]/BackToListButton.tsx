// app/[ticker]/BackToListButton.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Props = {
  variant?: "default" | "minimal" | "button";
};

export default function BackToListButton({ variant = "default" }: Props) {
  const [backUrl, setBackUrl] = useState("/");

  useEffect(() => {
    // sessionStorageから前回選択したタグを取得
    const lastTag = sessionStorage.getItem("lastSelectedTag");
    if (lastTag && lastTag !== "policy") {
      setBackUrl(`/?tag=${encodeURIComponent(lastTag)}`);
    } else {
      setBackUrl("/");
    }
  }, []);

  if (variant === "minimal") {
    return (
      <Link
        href={backUrl}
        className="group inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="w-3 h-3 transition-transform group-hover:-translate-x-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
        一覧へ戻る
      </Link>
    );
  }

  if (variant === "button") {
    return (
      <Link
        href={backUrl}
        className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-medium bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10"
      >
        一覧に戻る
      </Link>
    );
  }

  return (
    <Link
      href={backUrl}
      className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium bg-card/60 hover:bg-card/80 border border-border/40 hover:border-primary/30 backdrop-blur-sm transition-all duration-200 hover:shadow-md hover:shadow-primary/5"
    >
      <svg
        className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      一覧へ戻る
    </Link>
  );
}
