# スタイリング改善 引き継ぎ資料

## 現状

### 完了済み

#### 1. Container Queries 導入
- `@tailwindcss/container-queries` インストール済み
- `globals.css` に `@plugin "@tailwindcss/container-queries"` 追加済み

#### 2. Container Queries 適用済みページ
| ファイル | 適用箇所 |
|---------|----------|
| `app/dev/page.tsx` | ヘッダー、ナビリンク、フィルター |
| `app/dev/recommendations/page.tsx` | Meta情報、サマリーカード、フィルター、スコアリングルール |
| `app/dev/grok-analysis/page.tsx` | ナビゲーション、ヘッダー、メタ情報 |
| `app/dev/timing-analysis/page.tsx` | ナビゲーション、ヘッダー、サマリーカード |
| `app/dev/analyze/page.tsx` | ヘッダー |
| `app/dev/grok-analysis-v2/page.tsx` | ヘッダー |

#### 3. frontend-design プラグイン
- インストール済み: `frontend-design@claude-code-plugins`
- **要再起動**: Claude Code を再起動すると有効化

---

## 使用中の Container Query ブレークポイント

```
@sm:   コンテナ幅 ≥ 384px
@md:   コンテナ幅 ≥ 448px
@lg:   コンテナ幅 ≥ 512px
@xl:   コンテナ幅 ≥ 576px
@2xl:  コンテナ幅 ≥ 672px
@4xl:  コンテナ幅 ≥ 896px
```

### 使用例
```tsx
// 親要素に @container を指定
<div className="@container">
  // 子要素でコンテナ幅に応じたスタイル
  <div className="flex flex-col @lg:flex-row">
    <h1 className="text-xl @sm:text-2xl @md:text-3xl">
```

---

## 未完了タスク

### 優先度: 高
1. **KPIカード・チャートセクションへの Container Queries 適用**
   - `app/dev/page.tsx` の統計カード部分
   - `app/dev/timing-analysis/page.tsx` の要因別分析セクション

2. **共通コンポーネント抽出**
   - ナビゲーションリンク（各ページで重複）
   - フィルターボタングループ
   - サマリーカード

### 優先度: 中
3. **Typography 改善**
   - フォントサイズの一貫性
   - 行間・字間の最適化
   - 見出しの階層構造統一

4. **テーブルのレスポンシブ対応**
   - `recommendations/page.tsx` のテーブル
   - 横スクロール or カード表示切替

### 優先度: 低
5. **アニメーション最適化**
   - Framer Motion の遅延調整
   - 初回ロード時のスタッガー効果

---

## frontend-design スキルの使い方

再起動後、以下のように使用:

```
use the frontend design skill. /dev ページのサマリーカードをリデザイン
```

```
use the frontend design skill. recommendations ページのテーブルを改善
```

---

## 関連ファイル

```
app/
├── globals.css              # Container Queries プラグイン登録
├── dev/
│   ├── page.tsx             # メインダッシュボード
│   ├── recommendations/
│   │   └── page.tsx         # 売買推奨
│   ├── grok-analysis/
│   │   └── page.tsx         # Grok分析
│   ├── grok-analysis-v2/
│   │   └── page.tsx         # v2比較
│   ├── timing-analysis/
│   │   └── page.tsx         # タイミング分析
│   └── analyze/
│       └── page.tsx         # マーケット要因分析
```

---

## 注意事項

- `ymnk.jp` のトップページ（TradingView）は**変更しない**
- 変更対象は `ymnk.jp/dev` 以下のみ
- ビューポートベース (`md:`, `lg:`) と コンテナベース (`@md:`, `@lg:`) を混同しない
