'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

interface ResizableLayoutProps {
  leftPanel: React.ReactNode
  rightPanel: React.ReactNode
  defaultLeftWidth?: number
  minLeftWidth?: number
  maxLeftWidth?: number
  className?: string
  singlePanelMode?: boolean
  activePanel?: 'left' | 'right'
}

export function ResizableLayout({
  leftPanel,
  rightPanel,
  defaultLeftWidth = 50,
  minLeftWidth = 25,
  maxLeftWidth = 75,
  className,
  singlePanelMode = false,
  activePanel = 'left',
}: ResizableLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((e.clientX - rect.left) / rect.width) * 100
      setLeftWidth(Math.min(Math.max(pct, minLeftWidth), maxLeftWidth))
    },
    [isDragging, minLeftWidth, maxLeftWidth],
  )

  const handleMouseUp = useCallback(() => setIsDragging(false), [])

  useEffect(() => {
    if (!isDragging) return
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (singlePanelMode || isMobile) {
    return (
      <div ref={containerRef} className={cn('flex h-full', className)}>
        <div className="flex h-full w-full flex-col">
          {activePanel === 'left' ? leftPanel : rightPanel}
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('flex h-full', className)}>
      <div className="flex flex-col" style={{ width: `${leftWidth}%` }}>
        {leftPanel}
      </div>
      <div
        className={cn(
          'group relative w-px cursor-col-resize bg-border transition-all',
          isDragging && 'bg-primary',
        )}
        onMouseDown={handleMouseDown}
      >
        <div
          className={cn(
            'absolute inset-y-0 left-1/2 w-0 -translate-x-1/2 bg-primary transition-all duration-200',
            'group-hover:w-[3px]',
            isDragging && 'w-[3px]',
          )}
        />
        <div className="absolute inset-y-0 -left-2 -right-2" />
      </div>
      <div className="flex flex-1 flex-col">{rightPanel}</div>
    </div>
  )
}
