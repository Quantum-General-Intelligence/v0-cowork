'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Q-GST Engine',
    items: [{ label: 'Dashboard', href: '/', icon: '⚡' }],
  },
  {
    title: 'Qualtron Models',
    items: [
      { label: 'Model Instances', href: '/llm/agents', icon: '🧠' },
      { label: 'Spine Cortex', href: '/llm/cortex', icon: '🧬' },
      { label: 'GPU Deploy', href: '/llm/deploy', icon: '🚀' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Playground', href: '/playground', icon: '💬' },
      { label: 'Settings', href: '/settings', icon: '⚙️' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-60 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          Q
        </div>
        <span className="font-semibold text-sidebar-foreground">
          Qualtron Platform
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {section.title}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    <span className="flex h-5 w-5 items-center justify-center text-xs">
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="text-xs text-sidebar-foreground/50">
          Qualtron Platform v0.1.0
        </div>
      </div>
    </aside>
  )
}
