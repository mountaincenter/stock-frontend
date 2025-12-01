"use client";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterButtonGroupProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: "blue" | "green" | "purple";
  className?: string;
}

const GRADIENT_VARIANTS = {
  blue: "from-blue-500 to-cyan-600",
  green: "from-green-500 to-emerald-600",
  purple: "from-purple-500 to-pink-600",
} as const;

const SHADOW_VARIANTS = {
  blue: "shadow-blue-500/30",
  green: "shadow-green-500/30",
  purple: "shadow-purple-500/30",
} as const;

export function FilterButtonGroup<T extends string>({
  options,
  value,
  onChange,
  variant = "blue",
  className = "",
}: FilterButtonGroupProps<T>) {
  return (
    <div className={`flex gap-1 bg-slate-800/50 p-1.5 rounded-lg border border-slate-700/50 ${className}`}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-2.5 py-1.5 rounded text-xs font-semibold transition-all whitespace-nowrap ${
            value === option.value
              ? `bg-gradient-to-r ${GRADIENT_VARIANTS[variant]} text-white shadow-lg ${SHADOW_VARIANTS[variant]}`
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/30"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default FilterButtonGroup;
