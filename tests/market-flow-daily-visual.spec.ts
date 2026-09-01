import { expect, test } from "@playwright/test";

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 1100 },
] as const;

test.describe("daily market flow", () => {
  for (const viewport of viewports) {
    test(`keeps the daily decision view readable on ${viewport.name}`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const apiResponse = page.waitForResponse(
        (response) => response.url().includes("/api/dev/market-flow") && response.ok(),
        { timeout: 20_000 },
      );
      const response = await page.goto("http://localhost:3000/dev/market-flow-daily", {
        waitUntil: "domcontentloaded",
      });
      const marketFlowResponse = await apiResponse;
      const marketFlowPayload = await marketFlowResponse.json() as {
        rank_flow?: { rank_cap?: number };
      };
      await page.waitForLoadState("networkidle");

      expect(response?.ok()).toBeTruthy();
      expect(marketFlowPayload.rank_flow?.rank_cap).toBe(150);
      await expect(page.getByRole("heading", { name: /TOPIX|N225|指数/ }).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: "売買代金ランクの交代" })).toBeVisible();
      await expect(page.getByRole("img", { name: /5営業日前から.*Top30順位推移/ })).toBeVisible();
      await expect(page.getByRole("heading", { name: "翌日の優先順位" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "資金の行き先" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "N225 / TOPIX" })).toBeVisible();
      await expect(page.getByRole("navigation")).toBeVisible();
      await expect(page.getByRole("link", { name: "Dashboard", exact: true })).toHaveAttribute("href", "/dev");
      await expect(page.getByRole("link", { name: "Flow", exact: true })).toHaveAttribute("href", "/dev/market-flow-daily");
      await expect(page.getByRole("link", { name: "網羅版" })).toHaveAttribute("href", "/dev/market-flow");
      await expect(page.getByText(/米国指標、CME、先物/)).toBeVisible();
      await expect(page.getByText(/売買代金proxy|構成銘柄Va合計/).first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Top20|Top30/ })).toHaveCount(0);
      await expect(page.locator('[data-rank-point="true"]')).toHaveCount(0);
      await expect(page.getByText("順位推移", { exact: true })).toBeVisible();
      await expect(page.getByText(/31位以下はグラフに描画せず、実順位はテーブルの順位推移に表示します/)).toBeVisible();

      const rankAxisLabels = page.locator("[data-rank-axis-label]");
      await expect(rankAxisLabels).toHaveCount(30);
      await expect(rankAxisLabels.first()).toHaveText("1");
      await expect(rankAxisLabels.last()).toHaveText("30");

      const graphAndTableWidths = await page.locator("[data-rank-graph], [data-rank-table]").evaluateAll(
        (nodes) => nodes.map((node) => node.getBoundingClientRect().width),
      );
      expect(graphAndTableWidths).toHaveLength(2);
      expect(Math.abs(graphAndTableWidths[0] - graphAndTableWidths[1])).toBeLessThanOrEqual(1);

      const plotDots = page.locator("[data-plot-dot]");
      await expect(plotDots).toHaveCount(0);

      const rankHistories = page.locator("[data-rank-history]");
      const historyLabels = await rankHistories.allTextContents();
      expect(historyLabels.length).toBe(30);
      expect(historyLabels.every((label) => label.split("→").length === 5)).toBe(true);
      expect(historyLabels.every((label) => !label.includes("位") && !label.includes("圏外"))).toBe(true);
      expect(historyLabels.some((label) => label.split("→").some((rank) => Number(rank) > 30))).toBe(true);
      const historyAlignment = await rankHistories.first().evaluate(
        (node) => window.getComputedStyle(node).textAlign,
      );
      expect(historyAlignment).toBe("left");

      const improvedRank = page.locator('[data-rank-current-tone="improved"]').first();
      const declinedRank = page.locator('[data-rank-current-tone="declined"]').first();
      await expect(improvedRank).toHaveCSS("color", "rgb(80, 215, 164)");
      await expect(declinedRank).toHaveCSS("color", "rgb(255, 126, 143)");

      const priorityCompanies = page.locator('[data-rank-company]:not([data-priority-kind="none"])');
      expect(await priorityCompanies.count()).toBeGreaterThan(0);
      const priorityColorsMatch = await priorityCompanies.evaluateAll((nodes) => nodes.every((node) => {
        const kind = node.getAttribute("data-priority-kind");
        const expected = kind === "follow"
          ? "rgb(80, 215, 164)"
          : kind === "initial"
            ? "rgb(242, 197, 94)"
            : "rgb(255, 126, 143)";
        return window.getComputedStyle(node).color === expected;
      }));
      expect(priorityColorsMatch).toBe(true);

      const firstRankRow = page.locator("[data-rank-row]").first();
      const firstRowBottom = await firstRankRow.evaluate((node) => node.getBoundingClientRect().bottom);
      const firstRowBoundary = await page.locator("[data-rank-grid-line]").nth(1).evaluate(
        (node) => node.getBoundingClientRect().top,
      );
      expect(Math.abs(firstRowBottom - firstRowBoundary)).toBeLessThanOrEqual(1);

      const flowLines = page.locator("[data-flow-line]");
      expect(await flowLines.count()).toBe(30);
      const defaultLineColors = await flowLines.evaluateAll(
        (nodes) => [...new Set(nodes.map((node) => node.getAttribute("stroke")))],
      );
      expect(defaultLineColors).toHaveLength(1);
      expect(defaultLineColors[0]).toBe("#66736d");

      await page.screenshot({
        path: `test-results/market-flow-daily-${viewport.name}.png`,
        fullPage: true,
      });

      const firstFlowRow = page.locator("[data-flow-row]").first();
      const firstFlowKey = await firstFlowRow.getAttribute("data-flow-row");
      expect(firstFlowKey).toBeTruthy();
      await firstFlowRow.hover();
      await expect(page.locator(`[data-flow-line="${firstFlowKey}"]`)).toHaveAttribute("stroke", "#66736d");

      await page.getByRole("button", { name: "前日比" }).click();
      await expect(page.getByRole("img", { name: /前営業日から.*Top30順位推移/ })).toBeVisible();
      await page.getByRole("button", { name: "5日前比" }).click();
      await expect(page.getByRole("img", { name: /5営業日前から.*Top30順位推移/ })).toBeVisible();
      const rankSnapshots = page.locator("[data-rank-snapshot]");
      const plottedDateCount = await rankSnapshots.evaluateAll(
        (nodes) => new Set(nodes.map((node) => node.getAttribute("data-rank-snapshot"))).size,
      );
      expect(plottedDateCount).toBe(5);
      const viewportOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(viewportOverflow).toBe(0);
      expect(pageErrors).toEqual([]);

      await page.screenshot({
        path: `test-results/market-flow-daily-5d-${viewport.name}.png`,
        fullPage: true,
      });
    });
  }
});

test("routes Flow through daily before the comprehensive view", async ({ page }) => {
  await page.goto("http://localhost:3000/dev", { waitUntil: "domcontentloaded" });

  const flowLink = page.getByRole("link", { name: "Flow", exact: true }).first();
  await expect(flowLink).toHaveAttribute("href", "/dev/market-flow-daily");
  await flowLink.click();
  await expect(page).toHaveURL(/\/dev\/market-flow-daily$/);

  const comprehensiveLink = page.getByRole("link", { name: "網羅版", exact: true });
  await expect(comprehensiveLink).toHaveAttribute("href", "/dev/market-flow");
});
