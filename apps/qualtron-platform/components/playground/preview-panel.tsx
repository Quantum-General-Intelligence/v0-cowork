'use client'

interface PreviewPanelProps {
  content?: string
  className?: string
}

export function PreviewPanel({ content, className }: PreviewPanelProps) {
  return (
    <div className={`flex h-full flex-col bg-background ${className ?? ''}`}>
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          Preview
        </span>
      </div>
      <div className="flex flex-1 items-center justify-center">
        {content ? (
          <iframe
            srcDoc={content}
            className="h-full w-full border-0"
            sandbox="allow-scripts"
            title="Preview"
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            Code preview will appear here
          </p>
        )}
      </div>
    </div>
  )
}
