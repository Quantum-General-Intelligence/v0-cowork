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
    title: 'Engine',
    items: [{ label: 'Dashboard', href: '/', icon: '⚡' }],
  },
  {
    title: 'Models',
    items: [
      { label: 'Cognitive Models', href: '/llm/agents', icon: '🧠' },
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

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="flex h-12 items-center border-b border-border bg-sidebar px-4">
      {/* Logo */}
      <Link href="/" className="mr-6 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          Q
        </div>
        <span className="hidden font-semibold text-sidebar-foreground sm:inline">
          Qualtron
        </span>
      </Link>

      {/* Nav sections */}
      <div className="flex flex-1 items-center gap-1 overflow-x-auto">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.title} className="flex items-center">
            {si > 0 && <div className="mx-2 h-4 w-px bg-sidebar-border" />}
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
                    'flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )}
                >
                  <span className="text-xs">{item.icon}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      {/* Right side */}
      <div className="ml-4 flex items-center gap-2 text-[10px] text-sidebar-foreground/40">
        <span className="hidden lg:inline">Qualtron Platform v0.1.0</span>
      </div>
    </nav>
  )
}
