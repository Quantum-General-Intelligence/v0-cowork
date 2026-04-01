export default function KnowledgePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Graph</h1>
        <p className="text-muted-foreground">
          Explore the knowledge graph, nodes, and relationships.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">
          Graph visualization will be powered by @xyflow/react. Connect to
          SpacetimeDB to view nodes and edges.
        </p>
      </div>
    </div>
  )
}
