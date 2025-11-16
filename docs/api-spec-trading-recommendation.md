# Trading Recommendation API 仕様書

## 概要

Grok推奨銘柄の売買判断データをフロントエンドに提供するJSON API仕様。

## エンドポイント

```
GET /api/trading-recommendations
```

## レスポンス形式

### 成功時 (200 OK)

```json
{
  "version": "1.0",
  "generatedAt": "2025-11-10T00:33:40+09:00",
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
  "warnings": [
    "現状のバックテストデータは46件、統計的信頼性は限定的",
    "必ず推奨損切りラインを設定すること",
    "より多くのデータ（100件以上）で再検証が必要"
  ],
  "stocks": [
    {
      "ticker": "8746.T",
      "stockName": "unbanked",
      "grokRank": 6,
      "technicalData": {
        "prevDayChangePct": 1.3100436681222707,
        "atr": {
          "value": 4.7844827586206895,
          "level": "medium"
        },
        "volume": 125000,
        "volatilityLevel": "低ボラ"
      },
      "recommendation": {
        "action": "buy",
        "score": 80,
        "confidence": "high",
        "stopLoss": {
          "percent": 3.8,
          "calculation": "ATR × 0.8"
        },
        "reasons": [
          {
            "type": "grok_rank",
            "description": "Grokランク6は勝率50%",
            "impact": 30
          },
          {
            "type": "volatility",
            "description": "低ボラ（安定）",
            "impact": 10
          },
          {
            "type": "deep_analysis",
            "description": "【本命】営業利益+805%、訴訟和解12億円は一過性、11/14に2Q決算",
            "impact": 50
          }
        ]
      },
      "deepAnalysis": {
        "fundamentals": {
          "operatingProfitGrowth": 805.1,
          "eps": -127.56,
          "epsNote": "訴訟和解12億円（一過性）",
          "nextEarningsDate": "2025-11-14"
        },
        "riskFactors": [],
        "specialNotes": [
          "本業絶好調",
          "一過性損失を除けば優良"
        ]
      },
      "categories": ["IR好材料", "株クラバズ"]
    }
  ],
  "scoringRules": {
    "grokRank": {
      "high": {
        "ranks": [1, 2, 12, 13],
        "score": -50,
        "winRate": 0
      },
      "medium": {
        "ranks": [6, 8, 9, 11],
        "score": 30,
        "winRate": 50
      },
      "low": {
        "ranks": [3, 4, 5, 7],
        "score": -10,
        "winRate": 25
      },
      "veryLow": {
        "ranks": [10],
        "score": -40,
        "winRate": 25,
        "avgReturn": -4.95
      }
    },
    "prevDayChange": {
      "negative": {
        "score": 20,
        "reason": "リバウンド効果"
      },
      "positiveWithLowRank": {
        "score": -30,
        "reason": "勝率0%パターン",
        "condition": "ランク1,2 × 前日プラス"
      }
    },
    "volatility": {
      "low": {
        "score": 10,
        "threshold": 3.0
      },
      "high": {
        "score": -10,
        "threshold": 6.0
      }
    },
    "actionThresholds": {
      "buy": 30,
      "sell": -30
    },
    "stopLoss": {
      "buy": {
        "formula": "ATR × 0.8",
        "min": 2.0,
        "max": 5.0
      },
      "sell": {
        "formula": "ATR × 1.2",
        "min": 5.0,
        "max": 10.0
      }
    }
  }
}
```

## データ型定義

### Stock Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| ticker | string | Yes | ティッカーシンボル (例: "8746.T") |
| stockName | string | Yes | 銘柄名 |
| grokRank | integer | Yes | Grokランク (1-13) |
| technicalData | TechnicalData | Yes | テクニカルデータ |
| recommendation | Recommendation | Yes | 売買推奨 |
| deepAnalysis | DeepAnalysis | No | 深掘り分析結果 |
| categories | string[] | Yes | カテゴリー配列 |

### TechnicalData Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| prevDayChangePct | number \| null | Yes | 前日変化率(%) |
| atr | ATR | Yes | ATR情報 |
| volume | integer \| null | Yes | 出来高 |
| volatilityLevel | string | Yes | ボラティリティレベル ("低ボラ" \| "中ボラ" \| "高ボラ") |

### ATR Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| value | number \| null | Yes | ATR値(%) |
| level | string | Yes | レベル ("low" \| "medium" \| "high") |

### Recommendation Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| action | string | Yes | 推奨アクション ("buy" \| "sell" \| "hold") |
| score | integer | Yes | スコア (-100 ~ +100) |
| confidence | string | Yes | 信頼度 ("high" \| "medium" \| "low") |
| stopLoss | StopLoss | Yes | 損切りライン |
| reasons | Reason[] | Yes | 判断理由配列 |

### StopLoss Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| percent | number | Yes | 損切り率(%) |
| calculation | string | Yes | 計算式 (例: "ATR × 0.8") |

### Reason Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| type | string | Yes | 理由タイプ ("grok_rank" \| "prev_day_change" \| "volatility" \| "category" \| "deep_analysis") |
| description | string | Yes | 説明文 |
| impact | integer | Yes | スコアへの影響度 |

### DeepAnalysis Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| fundamentals | Fundamentals \| null | No | ファンダメンタルズ情報 |
| riskFactors | string[] | No | リスク要因 |
| specialNotes | string[] | No | 特記事項 |

### Fundamentals Object

| フィールド | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| operatingProfitGrowth | number \| null | No | 営業利益成長率(%) |
| eps | number \| null | No | EPS |
| epsNote | string \| null | No | EPS備考 |
| nextEarningsDate | string \| null | No | 次回決算日 (ISO 8601形式) |

## エラーレスポンス

### 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "推奨データが見つかりません"
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "データ生成中にエラーが発生しました",
    "details": "Error message here"
  }
}
```

## バージョニング

- APIバージョンは `version` フィールドで管理
- 現在のバージョン: `1.0`
- 破壊的変更がある場合は `2.0` に更新

## キャッシング

- レスポンスは1日1回更新（毎朝9:00前に生成）
- `generatedAt` フィールドで生成時刻を確認可能
- フロントエンド側で適切にキャッシュすること（推奨: 1時間）

## 利用例

### フロントエンドでの利用

```typescript
// 買い候補のみフィルタ
const buyStocks = data.stocks.filter(s => s.recommendation.action === 'buy')

// スコア降順でソート
const sortedByScore = [...data.stocks].sort((a, b) =>
  b.recommendation.score - a.recommendation.score
)

// 信頼度「高」のみ
const highConfidence = data.stocks.filter(s =>
  s.recommendation.confidence === 'high'
)

// 深掘り分析済みのみ
const deepAnalyzed = data.stocks.filter(s => s.deepAnalysis)
```

## 注意事項

1. **投資助言ではない**: このAPIは分析データを提供するものであり、投資の推奨ではありません
2. **統計的信頼性**: バックテストデータが46件と少ないため、信頼性は限定的
3. **損切りの徹底**: 必ず推奨損切りラインを設定してください
4. **データの検証**: より多くのデータで再検証が必要です
