"use client";

import { motion } from "framer-motion";

interface LoadingProps {
  message?: string;
  color?: "cyan" | "amber" | "emerald" | "purple";
}

const colorMap = {
  cyan: "text-cyan-400 border-cyan-400",
  amber: "text-amber-400 border-amber-400",
  emerald: "text-emerald-400 border-emerald-400",
  purple: "text-purple-400 border-purple-400",
};

export function Loading({ message = "Loading...", color = "cyan" }: LoadingProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <motion.div
        className={`w-8 h-8 border-2 ${colorMap[color]} border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <div className={`${colorMap[color].split(" ")[0]} animate-pulse`}>{message}</div>
    </div>
  );
}

export default Loading;
