# Trading Recommendation 統合ガイド

## 概要

Grok推奨銘柄の売買判断データをPython（バックエンド）からNext.js（フロントエンド）に連携するための統合ガイドです。

## アーキテクチャ

```
[Python Script]
    ↓ JSON出力
[dash_plotly/test_output/trading_recommendation.json]
    ↓ FastAPI読み込み
[Python/FastAPI] http://localhost:8000/api/trading-recommendations
    ↓ fetch
[Next.js Page] /dev/recommendations
```

**重要:** 他の `/dev` ページと同様に、Python API (localhost:8000) からデータを取得します。Next.js内部APIは使用しません。

## ファイル構成

### Python側（データ生成）

- **スクリプト**: `dash_plotly/scripts/generate_trading_recommendation.py`
- **出力（HTML）**: `dash_plotly/test_output/trading_recommendation.html`
- **出力（JSON）**: `dash_plotly/test_output/trading_recommendation.json`

### Python側（API）

- **FastAPIルーター**: `dash_plotly/server/routers/dev_trading_recommendation.py`
- **メインアプリ**: `dash_plotly/server/main.py` (ルーター登録)

### Next.js側（データ表示）

- **型定義**: `stock-frontend/types/trading-recommendation.ts`
- **API仕様書**: `stock-frontend/docs/api-spec-trading-recommendation.md`
- **表示ページ**: `stock-frontend/app/dev/recommendations/page.tsx`

## セットアップ手順

### 1. Pythonスクリプトの実行

```bash
cd /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly
python3 scripts/generate_trading_recommendation.py
```

**出力例:**
```
バックテストデータから統計情報を読み込み中...
最新Grok推奨銘柄を読み込み中...
各銘柄の前日データを取得中...
  3077.T データ取得中...
  ...

売買判断レポート（HTML）を生成しました: test_output/trading_recommendation.html
ファイルサイズ: 14.8 KB
売買判断レポート（JSON）を生成しました: test_output/trading_recommendation.json
ファイルサイズ: 15.3 KB

=== サマリー ===
買い候補: 4銘柄
売り候補: 3銘柄
静観: 5銘柄
```

### 2. Python APIサーバーの起動

```bash
cd /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly
docker compose up -d --build
```

または開発モードで起動:

```bash
python3 server.py
```

### 3. Next.jsサーバーの起動

```bash
cd /Users/hiroyukiyamanaka/Desktop/python_stock/stock-frontend
npm run dev
```

### 4. ブラウザでアクセス

- **推奨データ表示**: http://localhost:3000/dev/recommendations
- **Python API直接アクセス**: http://localhost:8000/api/trading-recommendations

## データ更新フロー

### 日次更新（推奨）

```bash
# 毎朝9:00前に実行（市場開始前）
cd /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly
python3 scripts/generate_trading_recommendation.py
```

### cron設定例

```bash
# crontabに追加
0 8 * * 1-5 cd /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly && python3 scripts/generate_trading_recommendation.py
```

平日の毎朝8:00に自動実行（取引日のみ）

## JSON データ仕様

### 基本構造

```json
{
  "version": "1.0",
  "generatedAt": "2025-11-10T10:17:46.933519",
  "dataSource": {
    "backtestCount": 46,
    "backtestPeriod": {
      "start": "2025-11-04",
      "end": "2025-11-07"
    },
    "technicalDataDate": "2025-11-09"
  },
  "summary": {
    "total": 12,
    "buy": 4,
    "sell": 3,
    "hold": 5
  },
  "warnings": [...],
  "stocks": [...],
  "scoringRules": {...}
}
```

詳細は `docs/api-spec-trading-recommendation.md` を参照。

## TypeScript型定義の使い方

### 基本的な使い方

```typescript
import type { TradingRecommendationResponse } from '@/types/trading-recommendation';
import { getBuyStocks, sortByScore } from '@/types/trading-recommendation';

// データ取得
const response = await fetch('/api/trading-recommendations');
const data: TradingRecommendationResponse = await response.json();

// 買い候補のみフィルタ
const buyStocks = getBuyStocks(data.stocks);

// スコア降順でソート
const sortedStocks = sortByScore(data.stocks);
```

### ユーティリティ関数

```typescript
import {
  getBuyStocks,
  getSellStocks,
  getHoldStocks,
  getHighConfidenceStocks,
  sortByScore,
  filterByConfidence,
  formatPercent,
  formatScore,
  formatStopLoss,
  getActionColor,
  getActionLabel,
} from '@/types/trading-recommendation';

// 買い候補を取得
const buyStocks = getBuyStocks(data.stocks);

// 信頼度「高」のみ
const highConfidence = getHighConfidenceStocks(data.stocks);

// フォーマット
const scoreText = formatScore(80); // "+80"
const stopLossText = formatStopLoss({ percent: 3.8, calculation: 'ATR × 0.8' }); // "3.8%"
const actionLabel = getActionLabel('buy'); // "買い"
const actionColor = getActionColor('buy'); // "#4CAF50"
```

## API エンドポイント

### GET http://localhost:8000/api/trading-recommendations

Python/FastAPIエンドポイント。JSONファイルから売買判断データを読み込んで返却します。

#### レスポンス例

```json
{
  "version": "1.0",
  "generatedAt": "2025-11-10T10:17:46.933519",
  "stocks": [
    {
      "ticker": "8746.T",
      "stockName": "unbanked",
      "grokRank": 6,
      "technicalData": {
        "prevDayChangePct": 1.31,
        "atr": {
          "value": 4.78,
          "level": "medium"
        },
        "volume": 125000,
        "volatilityLevel": "中ボラ"
      },
      "recommendation": {
        "action": "buy",
        "score": 100,
        "confidence": "high",
        "stopLoss": {
          "percent": 3.3,
          "calculation": "ATR × 0.8"
        },
        "reasons": [...]
      },
      "deepAnalysis": {
        "fundamentals": {
          "operatingProfitGrowth": 805.1,
          "eps": -127.56,
          "epsNote": "訴訟和解12億円（一過性）",
          "nextEarningsDate": "2025-11-14"
        },
        "specialNotes": [
          "本業絶好調",
          "一過性損失を除けば優良"
        ]
      }
    }
  ]
}
```

#### エラーレスポンス

ファイルが見つからない場合:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "推奨データが見つかりません"
  }
}
```

#### 実装の詳細

- **ファイルパス**: `dash_plotly/test_output/trading_recommendation.json`
- **エンコーディング**: UTF-8
- **CORS**: localhost:3000からのアクセスを許可
- **キャッシュ**: フロントエンド側でSWRやReact Queryを利用して適切にキャッシュすることを推奨

## トラブルシューティング

### JSONファイルが見つからない

**症状**: 404 Not Found

**原因**: Pythonスクリプトが実行されていない、またはパスが間違っている

**解決策**:
```bash
# 1. JSONファイルの存在確認
ls -la /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly/test_output/trading_recommendation.json

# 2. スクリプト再実行
cd /Users/hiroyukiyamanaka/Desktop/python_stock/dash_plotly
python3 scripts/generate_trading_recommendation.py
```

### 型エラー

**症状**: TypeScriptコンパイルエラー

**原因**: JSON仕様と型定義の不一致

**解決策**:
1. `docs/api-spec-trading-recommendation.md` を確認
2. `types/trading-recommendation.ts` の型定義を修正
3. 必要に応じてPython側のJSON生成ロジックを修正

### データが古い

**症状**: 昨日のデータが表示される

**原因**: キャッシュ、またはPythonスクリプトが実行されていない

**解決策**:
```bash
# 1. Pythonスクリプトを再実行
python3 scripts/generate_trading_recommendation.py

# 2. ブラウザのキャッシュをクリア
# 3. Next.jsを再起動
npm run dev
```

## 今後の拡張

### 自動更新機能

以下の方法が考えられます:

1. **定期的なポーリング**: フロントエンド側で一定間隔でAPIをポーリング
2. **SWR/React Query**: 自動的なデータ再検証とキャッシュ管理
3. **cron + webhooks**: Pythonスクリプト実行後にwebhookでフロントエンドに通知

### リアルタイム更新

WebSocketまたはServer-Sent Events (SSE)を利用して、Pythonスクリプト実行時にフロントエンドに通知する仕組みを追加可能。

### kabu STATION API連携

将来的にkabu STATION APIと連携する場合:
1. Python APIに自動売買ロジックを追加（新規エンドポイント作成）
2. 推奨データに基づいて自動的に注文を発行
3. ペーパートレードモードとライブモードを切り替え可能にする

## 参考資料

- **API仕様書**: `docs/api-spec-trading-recommendation.md`
- **TypeScript型定義**: `types/trading-recommendation.ts`
- **Pythonスクリプト**: `../dash_plotly/scripts/generate_trading_recommendation.py`
- **Next.js App Router**: https://nextjs.org/docs/app
- **kabu STATION API**: https://kabucom.github.io/kabusapi/

## 更新履歴

- 2025-11-10: 初版作成
  - JSON出力機能追加
  - Python/FastAPI エンドポイント実装
  - TypeScript型定義作成
  - 表示ページ作成（既存 `/dev` スタイルに合わせて再実装）
