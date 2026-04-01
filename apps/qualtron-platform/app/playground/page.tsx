export default function PlaygroundPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground">
          Chat with agents using the CachedLLM streaming API.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card" style={{ height: 'calc(100vh - 240px)' }}>
        <div className="flex h-full items-center justify-center">
          <p className="text-muted-foreground">
            Connect CachedLLM to enable the ChatStream component.
          </p>
        </div>
      </div>
    </div>
  )
}
