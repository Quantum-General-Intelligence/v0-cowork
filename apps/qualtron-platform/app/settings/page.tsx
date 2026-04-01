export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engine Settings</h1>
        <p className="text-muted-foreground">
          Configure Q-GST Engine tenant settings — quotas, consolidation
          schedules, retrieval backends, and automations.
        </p>
      </div>

      {/* Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SettingsSection
          title="Quotas & Rate Limits"
          description="Per-agent or tenant-wide limits on reducer calls, events, tokens, nodes, and edges. Rolling window or lifetime caps."
        />
        <SettingsSection
          title="Consolidation Schedule"
          description="Automatic memory maintenance — edge weight decay, cache eviction, event archival to episodic repos. Configurable interval and thresholds."
        />
        <SettingsSection
          title="Retrieval Backends"
          description="Registered search backends: Qvec hybrid (USearch + Tantivy), graph traversal, fulltext, vector, and external sources. Priority ordering."
        />
        <SettingsSection
          title="Engine Automations"
          description="Stateless tools triggered by repo events — CodeGraphContext, IngestSym, TrustGraph, code-review-graph. View status and trigger manually."
        />
        <SettingsSection
          title="Inference Backend"
          description="CachedLLM configuration — model stages (0.8B through 122B), quality tiers, thinking mode, and GPU deployment."
        />
        <SettingsSection
          title="Integrations"
          description="Installed agent integrations — Claude Code plugin, OpenClaw skill, GitNexus MCP, and custom connectors. View install instructions and status."
        />
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="mb-2 font-semibold text-card-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      <p className="mt-3 text-xs text-muted-foreground/60">
        Connect to the Q-GST Engine to configure.
      </p>
    </div>
  )
}
