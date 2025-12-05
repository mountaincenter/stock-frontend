"use client";

interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterButtonGroupProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterButtonGroup<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: FilterButtonGroupProps<T>) {
  return (
    <div className={`inline-flex rounded-lg bg-muted/30 p-1 ${className}`}>
      {options.map((option) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            onClick={() => onChange(option.value)}
            className={`
              px-3 py-1.5 text-xs font-semibold transition-all rounded-md
              ${isActive
                ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/50"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }
            `}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default FilterButtonGroup;
