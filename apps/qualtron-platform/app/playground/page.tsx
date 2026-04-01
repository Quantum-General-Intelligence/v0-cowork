export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Agent Playground
        </h1>
        <p className="text-muted-foreground">
          Chat with Q-GST Engine agents using the streaming inference API.
          Select an agent, send messages, and see responses with context from
          the agent&apos;s brain memory and knowledge graph.
        </p>
      </div>

      <div
        className="rounded-lg border border-border bg-card"
        style={{ height: 'calc(100vh - 240px)' }}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              Connect the inference backend to enable agent chat.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              The ChatStream component will render here with agent selection,
              streaming responses, and thinking sections.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
