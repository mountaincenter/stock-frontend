import DemoLwc from "../../components/demo_lwc";

export default function Page() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <h1 className="text-xl font-semibold mb-4">
        Lightweight Charts / ja-JP（短期=5m/15m/1h・長期=1d）
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        期間スイッチャーに応じて最適な interval
        を自動選択し、価格・出来高を日本語ロケールで表示します。
      </p>
      <div className="w-full max-w-5xl mx-auto">
        <DemoLwc />
      </div>
    </main>
  );
}
