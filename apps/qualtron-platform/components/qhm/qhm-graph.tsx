'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface GraphNode {
  id: string
  label: string
  type: string // qlang role or entity type
}

interface GraphEdge {
  source: string
  target: string
  label: string
  confidence?: number
}

interface QHMGraphProps {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width?: number
  height?: number
}

const TYPE_COLORS: Record<string, string> = {
  Obligation: '#f59e0b',
  Permission: '#22c55e',
  Prohibition: '#ef4444',
  Condition: '#3b82f6',
  TriggerRule: '#8b5cf6',
  TimeCondition: '#06b6d4',
  Entity: '#64748b',
  Actor: '#ec4899',
  Action: '#14b8a6',
  Claim: '#a855f7',
  Cause: '#f97316',
  Event: '#6366f1',
  Attribute: '#84cc16',
  default: '#94a3b8',
}

export function QHMGraph({
  nodes,
  edges,
  width = 800,
  height = 500,
}: QHMGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    const g = svg.append('g')

    // Zoom
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => g.attr('transform', event.transform))
    svg.call(zoom)

    // Force simulation
    const simNodes = nodes.map((n) => ({ ...n })) as (GraphNode &
      d3.SimulationNodeDatum)[]
    const simEdges = edges.map((e) => ({
      ...e,
      source: e.source,
      target: e.target,
    })) as (GraphEdge &
      d3.SimulationLinkDatum<GraphNode & d3.SimulationNodeDatum>)[]

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3
          .forceLink(simEdges)
          .id((d: any) => d.id)
          .distance(120),
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Edges
    const link = g
      .append('g')
      .selectAll('line')
      .data(simEdges)
      .join('line')
      .attr('stroke', 'var(--border)')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5)

    // Edge labels
    const linkLabel = g
      .append('g')
      .selectAll('text')
      .data(simEdges)
      .join('text')
      .attr('font-size', 9)
      .attr('fill', 'var(--muted-foreground)')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.label)

    // Nodes
    const node = g
      .append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .call(
        d3
          .drag<SVGGElement, GraphNode & d3.SimulationNodeDatum>()
          .on('start', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d: any) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d: any) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any,
      )

    // Node circles
    node
      .append('circle')
      .attr('r', 16)
      .attr('fill', (d: any) => TYPE_COLORS[d.type ?? ''] ?? TYPE_COLORS.default)
      .attr('stroke', 'var(--background)')
      .attr('stroke-width', 2)
      .attr('cursor', 'grab')

    // Node labels
    node
      .append('text')
      .attr('dy', 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', 10)
      .attr('fill', 'var(--foreground)')
      .text((d: any) => {
        const label = d.label ?? ''
        return label.length > 25 ? label.slice(0, 22) + '...' : label
      })

    // Type badge inside circle
    node
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', 8)
      .attr('font-weight', 'bold')
      .attr('fill', 'white')
      .text((d: any) => (d.type ?? '').slice(0, 3).toUpperCase())

    // Tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      linkLabel
        .attr('x', (d: any) => (d.source.x + d.target.x) / 2)
        .attr('y', (d: any) => (d.source.y + d.target.y) / 2)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, edges, width, height])

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{
        backgroundColor: 'var(--card)',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
      }}
    />
  )
}
