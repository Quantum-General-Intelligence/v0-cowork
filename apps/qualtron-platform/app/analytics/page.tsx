export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Usage metering, token costs, and quota tracking.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Analytics charts will be powered by recharts. Connect backends to view
          usage data.
        </p>
      </div>
    </div>
  )
}
