'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Engine Dashboard', href: '/', icon: '⚡' },
  { label: 'Agents', href: '/agents', icon: '🤖' },
  { label: 'Knowledge Graph', href: '/knowledge', icon: '🔗' },
  { label: 'Engine Analytics', href: '/analytics', icon: '📊' },
  { label: 'Engine Settings', href: '/settings', icon: '⚙️' },
  { label: 'Agent Playground', href: '/playground', icon: '💬' },
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
      <nav className="flex-1 space-y-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
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
              <span className="flex h-5 w-5 items-center justify-center rounded text-xs font-mono opacity-60">
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="text-xs text-sidebar-foreground/50">
          Q-GST Engine v0.1.0
        </div>
      </div>
    </aside>
  )
}
