import Link from 'next/link'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Q-GST Engine Dashboard
        </h1>
        <p className="text-muted-foreground">
          Cognitive infrastructure overview — agents, memory, knowledge graph,
          and temporal state.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Agents"
          value="—"
          subtitle="Registered in engine"
          href="/agents"
        />
        <StatCard
          title="Graph Entities"
          value="—"
          subtitle="Nodes in knowledge graph"
          href="/knowledge"
        />
        <StatCard title="Episodic Events" value="—" subtitle="Recorded today" />
        <StatCard title="Current Tick" value="—" subtitle="Engine epoch" />
      </div>

      {/* Engine Systems */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold text-card-foreground">
            Episodic Memory Stream
          </h3>
          <p className="text-sm text-muted-foreground">
            Real-time feed of agent actions, observations, reflections, and
            system events. Connect to the Q-GST Engine to view live activity.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="mb-2 font-semibold text-card-foreground">
            Token Usage & Metering
          </h3>
          <p className="text-sm text-muted-foreground">
            Agent inference costs, reducer calls, and quota tracking. Connect
            the inference backend to view usage data.
          </p>
        </div>
      </div>

      {/* Engine Capabilities */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Engine Capabilities</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CapabilityCard
            title="Knowledge Graph"
            description="Multi-graph entities with weighted relationships, temporal validity, and causal tracking."
            href="/knowledge"
          />
          <CapabilityCard
            title="Versioned Memory"
            description="Git-backed content store with 5 brain repos per agent. PRs for human-in-the-loop review."
            href="/agents"
          />
          <CapabilityCard
            title="Temporal Engine"
            description="Turn-based epochs, causal DAG, future events, and Chronos recurring loops."
            href="/analytics"
          />
          <CapabilityCard
            title="Focus Cache"
            description="Hot memory with relevance scoring — frequently accessed items stay in focus."
            href="/analytics"
          />
          <CapabilityCard
            title="Retrieval Backends"
            description="Pluggable search: Qvec hybrid (dense + BM25), graph traversal, keyword, and external sources."
            href="/settings"
          />
          <CapabilityCard
            title="Engine Automations"
            description="CodeGraphContext, IngestSym, TrustGraph — stateless tools triggered by repo events."
            href="/settings"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string
  value: string
  subtitle: string
  href?: string
}) {
  const content = (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30">
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="mt-1 text-3xl font-bold text-card-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function CapabilityCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30"
    >
      <h4 className="text-sm font-semibold text-card-foreground">{title}</h4>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </Link>
  )
}
