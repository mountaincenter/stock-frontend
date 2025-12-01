"use client";

import { motion } from "framer-motion";

interface SummaryCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  valueColor?: "default" | "positive" | "negative" | "amber" | "cyan" | "blue" | "green";
  delay?: number;
  className?: string;
}

const VALUE_COLORS = {
  default: "text-slate-100",
  positive: "text-emerald-400",
  negative: "text-red-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  blue: "text-blue-400",
  green: "text-green-400",
} as const;

export function SummaryCard({
  label,
  value,
  subValue,
  valueColor = "default",
  delay = 0,
  className = "",
}: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4 @sm:p-6 ${className}`}
    >
      <div className="text-slate-400 text-xs @sm:text-sm mb-2">{label}</div>
      <div className={`text-2xl @sm:text-3xl font-bold ${VALUE_COLORS[valueColor]}`}>
        {value}
      </div>
      {subValue && (
        <div className="text-slate-500 text-[10px] @sm:text-xs mt-1">{subValue}</div>
      )}
    </motion.div>
  );
}

export default SummaryCard;
