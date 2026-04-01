export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Tenant configuration, consolidation schedules, and retrieval sources.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Settings will include quota management, consolidation schedules, and
          retrieval source configuration.
        </p>
      </div>
    </div>
  )
}
