export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engine Analytics</h1>
        <p className="text-muted-foreground">
          Usage metering, token costs, quota tracking, and temporal state for
          the Q-GST Engine.
        </p>
      </div>

      {/* Metering */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Usage Metering</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Reducer Calls" value="—" period="today" />
          <MetricCard label="Events Created" value="—" period="today" />
          <MetricCard label="Tokens (Input)" value="—" period="this month" />
          <MetricCard label="Tokens (Output)" value="—" period="this month" />
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Timeline</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <MetricCard label="Current Tick" value="—" period="epoch" />
          <MetricCard label="Active Chronos Loops" value="—" period="" />
          <MetricCard label="Pending Future Events" value="—" period="" />
        </div>
      </div>

      {/* Consolidation */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Memory Consolidation</h2>
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Connect to the Q-GST Engine to view consolidation history — edge
          decay, cache eviction, event archival, and promotion metrics.
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  period,
}: {
  label: string
  value: string
  period: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-card-foreground">{value}</p>
      {period && (
        <p className="mt-0.5 text-xs text-muted-foreground">{period}</p>
      )}
    </div>
  )
}
