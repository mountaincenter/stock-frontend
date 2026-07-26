import { buildApiUrl } from "@/lib/api-base";
import type {
  CaseListResponse,
  DailyStageResponse,
  Decision,
  IntradayStageResponse,
  ResultStageResponse,
} from "./types";

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the HTTP status as the fallback error.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export async function listReplayCases(ticker: string): Promise<CaseListResponse> {
  const query = new URLSearchParams({ ticker });
  const response = await fetch(
    buildApiUrl(`/api/trading/replay/cases?${query.toString()}`),
    { cache: "no-store" },
  );
  return readJson<CaseListResponse>(response);
}

export async function loadDailyStage(caseId: string): Promise<DailyStageResponse> {
  const response = await fetch(
    buildApiUrl(`/api/trading/replay/cases/${encodeURIComponent(caseId)}/daily`),
    { cache: "no-store" },
  );
  return readJson<DailyStageResponse>(response);
}

export async function loadIntradayStage(
  caseId: string,
): Promise<IntradayStageResponse> {
  const response = await fetch(
    buildApiUrl(`/api/trading/replay/cases/${encodeURIComponent(caseId)}/intraday`),
    { cache: "no-store" },
  );
  return readJson<IntradayStageResponse>(response);
}

export async function loadResultStage(
  caseId: string,
  dailyDecision: Decision,
  intradayDecision: Decision,
): Promise<ResultStageResponse> {
  const response = await fetch(
    buildApiUrl(`/api/trading/replay/cases/${encodeURIComponent(caseId)}/result`),
    {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        daily_decision: dailyDecision,
        intraday_decision: intradayDecision,
      }),
    },
  );
  return readJson<ResultStageResponse>(response);
}
