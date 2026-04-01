export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
        <p className="text-muted-foreground">
          Explore the Q-GST Engine knowledge graph — entities, relationships,
          and temporal validity across all agents and projects.
        </p>
      </div>

      {/* Graph Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Nodes</p>
          <p className="mt-0.5 text-xl font-bold text-card-foreground">—</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Edges</p>
          <p className="mt-0.5 text-xl font-bold text-card-foreground">—</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">Graphs</p>
          <p className="mt-0.5 text-xl font-bold text-card-foreground">—</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs font-medium text-muted-foreground">
            Entity Types
          </p>
          <p className="mt-0.5 text-xl font-bold text-card-foreground">—</p>
        </div>
      </div>

      <div
        className="rounded-lg border border-border bg-card"
        style={{ height: 'calc(100vh - 320px)' }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              Graph visualization powered by React Flow.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Connect to the Q-GST Engine to explore nodes (entities) and edges
              (relationships) with temporal filtering.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
