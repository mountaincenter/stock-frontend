// ToolbarMobile.tsx
import React from "react";
import { PRICE_LABELS } from "../constants";
import type { PriceSortKey, SortSpec, SortDir } from "../types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SortChips } from "./SortChips";

export function ToolbarMobile({
  sorts,
  onAdd,
  onRemove,
  onReset,
}: {
  sorts: SortSpec<PriceSortKey>[];
  onAdd: (key: PriceSortKey, dir: SortDir) => void;
  onRemove: (key: PriceSortKey) => void;
  onReset: () => void;
}) {
  const [sel, setSel] = React.useState<PriceSortKey | "">("");
  const [dir, setDir] = React.useState<SortDir>("desc");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select value={sel} onValueChange={(v) => setSel(v as PriceSortKey)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="列を選択" />
          </SelectTrigger>
          <SelectContent>
            {(
              [
                "code",
                "stock_name",
                "close",
                "diff",
                "pct_diff",
                "volume",
                "vol_ma10",
              ] as PriceSortKey[]
            ).map((k) => (
              <SelectItem key={k} value={k}>
                {PRICE_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dir} onValueChange={(v) => setDir(v as SortDir)}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">昇順</SelectItem>
            <SelectItem value="desc">降順</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => sel && onAdd(sel, dir)}>追加</Button>
        <Button variant="secondary" className="ml-auto" onClick={onReset}>
          リセット
        </Button>
      </div>
      <SortChips sorts={sorts} onRemove={onRemove} />
    </div>
  );
}
