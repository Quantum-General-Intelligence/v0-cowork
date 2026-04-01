'use client'

import { use } from 'react'
import Link from 'next/link'

export default function SkillsPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = use(params)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/agents/${name}`}
          className="text-muted-foreground hover:text-foreground"
        >
          ← {name}
        </Link>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold tracking-tight">Skill Library</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Skills are learned methodology stored in the agent&apos;s knowledge
        wiki. They improve automatically based on quality signals — successful
        patterns from approved reviews get reinforced, rejected patterns get
        corrected.
      </p>

      {/* Skill Categories */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SkillCategory
          title="Extraction"
          description="Entity and relation extraction from unstructured text"
          skills={['Entity Extraction', 'Relation Extraction']}
        />
        <SkillCategory
          title="Analysis"
          description="Review workflows and assessment methodology"
          skills={['Contract Review', 'Risk Assessment']}
        />
        <SkillCategory
          title="Graph Building"
          description="Knowledge graph design patterns and conventions"
          skills={['Graph Design Patterns', 'UID Conventions']}
        />
        <SkillCategory
          title="Integration Plugins"
          description="Installed integration plugins and their configurations"
          skills={['Claude Code', 'Memory Commands']}
        />
        <SkillCategory
          title="Successful Patterns"
          description="Work patterns that received positive quality signals"
          skills={[]}
          placeholder="Patterns are learned from approved knowledge reviews."
        />
        <SkillCategory
          title="Corrections"
          description="Lessons from rejected work and reviewer feedback"
          skills={[]}
          placeholder="Corrections are learned from rejected knowledge reviews."
        />
      </div>

      <div className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Connect Q-GST Versioned Memory to browse live skill pages from{' '}
        <span className="font-mono text-primary">{name}-knowledge</span> wiki.
      </div>
    </div>
  )
}

function SkillCategory({
  title,
  description,
  skills,
  placeholder,
}: {
  title: string
  description: string
  skills: string[]
  placeholder?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {skills.length > 0 ? (
        <div className="mt-3 space-y-1">
          {skills.map((skill) => (
            <div
              key={skill}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <span className="text-accent">⚡</span>
              {skill}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs italic text-muted-foreground/60">
          {placeholder ?? 'No skills yet.'}
        </p>
      )}
    </div>
  )
}
