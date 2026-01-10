export interface ElectionResult {
  num: number
  dissolution: string
  election: string
  days: number
  startPrice: number
  endPrice: number
  returnPct: number
  note: string
  win: boolean
}

export interface StockDetail {
  num: number
  startPrice: number
  endPrice: number
  returnPct: number
  profit100: number
}

export interface StockCorrelation {
  ticker: string
  stockName: string
  category: string
  correlation: number
  avgReturn: number
  winRate: number
  latestClose: number
  details: StockDetail[]
}

export interface ElectionData {
  n225Summary: {
    wins: number
    total: number
    avgReturn: number
    maxReturn: number
    minReturn: number
  }
  n225Results: ElectionResult[]
  n225Daily: Array<{
    num: number
    note: string
    win: boolean
    data: number[]
  }>
  correlations: StockCorrelation[]
  pickBalanced: string[]
  pickHighCorr: string[]
  generatedAt: string
}
