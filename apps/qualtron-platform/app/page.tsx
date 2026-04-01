export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Q-GST Engine deployment.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Agents" value="—" subtitle="Registered agents" />
        <StatCard title="Knowledge Nodes" value="—" subtitle="In graph" />
        <StatCard title="Events" value="—" subtitle="Recorded today" />
        <StatCard title="Current Tick" value="—" subtitle="Epoch" />
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold text-card-foreground">
            Recent Events
          </h3>
          <p className="text-sm text-muted-foreground">
            Connect to SpacetimeDB to view real-time events.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold text-card-foreground">
            Usage Overview
          </h3>
          <p className="text-sm text-muted-foreground">
            Connect to CachedLLM to view token usage.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string
  subtitle: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-bold text-card-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
}
