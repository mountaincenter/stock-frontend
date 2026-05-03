"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const isDev = process.env.NODE_ENV === "development";

interface NavItem {
  href: string;
  label: string;
}

// 3グループに分類
const NAV_GROUPS: NavItem[][] = [
  // Overview
  [
    { href: "/dev", label: "Dashboard" },
    { href: "/dev/analysis-custom", label: "Custom" },
    { href: "/dev/analysis-ml", label: "ML" },
  ],
  // Analysis
  [
    { href: "/dev/recommendations", label: "Recs" },
    { href: isDev ? "/dev/dev-stock-results" : "/dev/stock-results", label: "Results" },
    { href: "/dev/reports", label: "Reports" },
  ],
  // Strategy
  [
    { href: "/dev/granville", label: "Granville" },
    { href: "/dev/reversal", label: "Reversal" },
    { href: "/dev/pairs", label: "Pairs" },
    { href: "/dev/calendar", label: "Calendar" },
    { href: "/dev/dashboard", label: "Trading" },
    { href: "/dev/strategy/granville", label: "Strategy" },
  ],
];

interface DevNavLinksProps {
  links?: string[];
  className?: string;
}

export function DevNavLinks({ className = "" }: DevNavLinksProps) {
  const pathname = usePathname();

  return (
    <nav className={`flex items-center h-8 ${className}`}>
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className="flex items-center">
          {gi > 0 && <div className="w-px h-3.5 bg-border/40 mx-1.5" />}
          <div className="flex items-center gap-0.5">
            {group.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? "text-foreground bg-muted/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default DevNavLinks;
