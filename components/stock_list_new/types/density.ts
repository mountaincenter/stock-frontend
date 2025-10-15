// components/stock_list_new/types/density.ts

/**
 * 表示密度タイプ
 */
export type DisplayDensity = "compact" | "normal" | "comfortable";

/**
 * 表示密度ラベル
 */
export const DENSITY_LABELS: Record<DisplayDensity, string> = {
  compact: "コンパクト",
  normal: "標準",
  comfortable: "ゆったり",
};

/**
 * 表示密度に応じたスタイル設定
 */
export interface DensityStyles {
  rowPadding: string; // py-X
  columnGap: string; // 12px, 16px, 20px
  rowSpacing: string; // space-y-X
  fontSize: {
    code: string;
    stockName: string;
    date: string;
    data: string;
  };
}

/**
 * 各密度の数値定義（clsxとstyle属性で使用）
 */
export const DENSITY_VALUES: Record<DisplayDensity, {
  rowPaddingY: number; // rem単位
  columnGap: number; // px単位
  rowSpacing: number; // rem単位
}> = {
  compact: {
    rowPaddingY: 0.375, // py-1.5 = 6px
    columnGap: 6,
    rowSpacing: 0.25, // space-y-1
  },
  normal: {
    rowPaddingY: 0.75, // py-3 = 12px (old版)
    columnGap: 12,
    rowSpacing: 0.5, // space-y-2
  },
  comfortable: {
    rowPaddingY: 1.25, // py-5 = 20px
    columnGap: 20,
    rowSpacing: 0.75, // space-y-3
  },
};

/**
 * 各密度のスタイル定義
 */
export const DENSITY_STYLES: Record<DisplayDensity, DensityStyles> = {
  compact: {
    rowPadding: "py-1.5",
    columnGap: "6px",
    rowSpacing: "space-y-1",
    fontSize: {
      code: "text-sm",
      stockName: "text-xs",
      date: "text-[10px]",
      data: "text-sm",
    },
  },
  normal: {
    rowPadding: "py-3",
    columnGap: "12px",
    rowSpacing: "space-y-2",
    fontSize: {
      code: "text-base",
      stockName: "text-sm",
      date: "text-[12px]",
      data: "text-base",
    },
  },
  comfortable: {
    rowPadding: "py-5",
    columnGap: "20px",
    rowSpacing: "space-y-3",
    fontSize: {
      code: "text-lg",
      stockName: "text-base",
      date: "text-[13px]",
      data: "text-lg",
    },
  },
};

/**
 * 密度スタイルを取得
 */
export function getDensityStyles(density: DisplayDensity): DensityStyles {
  return DENSITY_STYLES[density];
}
