"use client";

import Link from "next/link";
import {
  TrendingUp,
  Activity,
  Target,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

export type NavLinkVariant = "gradient" | "simple";

interface NavLinkConfig {
  href: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  shadowColor: string;
  simpleColor: string;
}

const NAV_LINKS: Record<string, NavLinkConfig> = {
  dashboard: {
    href: "/dev",
    label: "ダッシュボード",
    icon: ArrowLeft,
    gradient: "from-slate-500 via-slate-600 to-slate-700",
    shadowColor: "slate-500/50",
    simpleColor: "text-slate-400 hover:text-white",
  },
  analyze: {
    href: "/dev/analyze",
    label: "分析",
    icon: TrendingUp,
    gradient: "from-indigo-500 via-purple-500 to-pink-500",
    shadowColor: "purple-500/50",
    simpleColor: "text-purple-400 hover:text-purple-300",
  },
  grokAnalysis: {
    href: "/dev/grok-analysis",
    label: "Grok分析",
    icon: BarChart3,
    gradient: "from-cyan-500 via-blue-500 to-indigo-600",
    shadowColor: "blue-500/50",
    simpleColor: "text-blue-400 hover:text-blue-300",
  },
  timing: {
    href: "/dev/timing-analysis",
    label: "タイミング",
    icon: Activity,
    gradient: "from-amber-500 via-orange-500 to-red-600",
    shadowColor: "orange-500/50",
    simpleColor: "text-orange-400 hover:text-orange-300",
  },
  grokV2: {
    href: "/dev/grok-analysis-v2",
    label: "v2比較",
    icon: BarChart3,
    gradient: "from-violet-500 via-purple-500 to-fuchsia-600",
    shadowColor: "violet-500/50",
    simpleColor: "text-violet-400 hover:text-violet-300",
  },
  recommendations: {
    href: "/dev/recommendations",
    label: "売買推奨",
    icon: Target,
    gradient: "from-emerald-500 via-green-500 to-teal-600",
    shadowColor: "green-500/50",
    simpleColor: "text-green-400 hover:text-green-300",
  },
};

interface DevNavLinksProps {
  variant?: NavLinkVariant;
  links: (keyof typeof NAV_LINKS)[];
  className?: string;
}

export function DevNavLinks({ variant = "gradient", links, className = "" }: DevNavLinksProps) {
  return (
    <div className={`flex flex-wrap @xl:flex-nowrap gap-2 ${className}`}>
      {links.map((key) => {
        const link = NAV_LINKS[key];
        if (!link) return null;
        const Icon = link.icon;

        if (variant === "simple") {
          return (
            <Link
              key={key}
              href={link.href}
              className={`inline-flex items-center ${link.simpleColor} transition-colors group text-sm @sm:text-base`}
            >
              <Icon className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              {key === "dashboard" ? "ダッシュボードへ戻る" : link.label}
            </Link>
          );
        }

        return (
          <Link
            key={key}
            href={link.href}
            className={`group relative flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-br ${link.gradient} text-white rounded-lg font-semibold text-sm whitespace-nowrap overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-${link.shadowColor} hover:scale-105`}
            title={link.label}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <Icon className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative z-10">{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default DevNavLinks;
