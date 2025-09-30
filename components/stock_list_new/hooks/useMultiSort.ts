// components/stock_list_new/hooks/useMultiSort.ts
import { useMemo } from "react";
import type { SortSpec, SortDir } from "../types";

type Accessor<T, K extends string> = (row: T, key: K) => unknown;

export function useMultiSort<T, K extends string>(
  rows: T[],
  sorts: SortSpec<K>[],
  accessor: Accessor<T, K>
) {
  const sorted = useMemo(() => {
    if (!sorts.length) return rows;

    const arr = [...rows];

    arr.sort((a, b) => {
      for (const s of sorts) {
        const va = accessor(a, s.key);
        const vb = accessor(b, s.key);
        const na = norm(va);
        const nb = norm(vb);

        if (na < nb) return s.dir === "asc" ? -1 : 1;
        if (na > nb) return s.dir === "asc" ? 1 : -1;
      }
      return 0;
    });

    return arr;
  }, [rows, sorts, accessor]);

  return sorted;
}

function norm(v: unknown): number | string {
  if (v == null) return Number.NEGATIVE_INFINITY;

  if (typeof v === "string") {
    return v.toLowerCase();
  }

  let n: number;
  if (typeof v === "number") {
    n = v;
  } else {
    n = Number(v);
  }
  return Number.isFinite(n) ? n : 0;
}

export function toggleDir(cur?: SortDir): SortDir {
  return cur === "asc" ? "desc" : "asc";
}
