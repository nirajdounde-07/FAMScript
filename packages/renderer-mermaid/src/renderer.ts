import type { PositionedNode } from '@famscript/layout'
import type { RelationEdge } from '@famscript/parser'
import type { LayoutResult } from '@famscript/layout'
import type { RenderConfig } from './types.js'

// ─── constants ───────────────────────────────────────────────────────────────

const DEFAULTS: Required<RenderConfig> = {
  direction: 'TD',
  showGenerationSubgraphs: true,
  showEdgeLabels: true,
  labelFormat: 'full',
}

// ─── helpers ─────────────────────────────────────────────────────────────────vfdsavavvvvvv

/**
 * Escape characters that would break Mermaid label syntax inside ["..."].
 * Uses Mermaid's HTML-entity shorthand (# prefix).
 */
function escapeLabel(text: string): string {
  return text
    .replace(/"/g, '#quot;')
    .replace(/</g, '#lt;')
    .replace(/>/g, '#gt;')
    .replace(/\[/g, '#lsqb;')
    .replace(/\]/g, '#rsqb;')
    .replace(/\{/g, '#lcub;')
    .replace(/\}/g, '#rcub;')
}

function generationLabel(g: number): string {
  if (g === 0) return 'G0'
  return g > 0 ? `G+${g}` : `G${g}`
}

/** Stable, filesystem-safe subgraph ID for a generation integer. */
function subgraphId(generation: number): string {
  if (generation === 0) return 'gen_0'
  if (generation > 0) return `gen_p${generation}`
  return `gen_n${Math.abs(generation)}`
}

function buildNodeLabel(node: PositionedNode, format: Required<RenderConfig>['labelFormat']): string {
  const age = node.age !== undefined ? String(node.age) : '?'
  switch (format) {
    case 'name-only':
      return escapeLabel(node.name)
    case 'name-age':
      return escapeLabel(`${node.name} | ${age}`)
    default: {
      const parts: string[] = [node.name, age, node.gender, generationLabel(node.generation)]
      if (node.status && node.status !== 'living') parts.push(node.status)
      return escapeLabel(parts.join(' | '))
    }
  }
}

/** Map a RelationEdge type to its Mermaid arrow syntax. */
function arrowFor(edgeType: string): string {
  switch (edgeType) {
    case 'parent_child': return '-->'
    case 'married':      return '---'
    case 'core_couple':  return '==='
    case 'distant':      return '-.->'
    default:             return '-->'
  }
}

function buildEdgeLine(edge: RelationEdge, showLabels: boolean): string {
  const arrow = arrowFor(edge.type)
  if (showLabels && edge.label) {
    return `  ${edge.from} ${arrow}|"${escapeLabel(edge.label)}"| ${edge.to}`
  }
  return `  ${edge.from} ${arrow} ${edge.to}`
}

// ─── public API ──────────────────────────────────────────────────────────────

export function renderToMermaid(
  layout: LayoutResult,
  config: Partial<RenderConfig> = {},
): string {
  const cfg: Required<RenderConfig> = { ...DEFAULTS, ...config }
  const { nodes, edges } = layout

  if (nodes.length === 0) {
    return `graph ${cfg.direction}\n`
  }

  const lines: string[] = [`graph ${cfg.direction}`]

  // ── node declarations ────────────────────────────────────────────────────

  if (cfg.showGenerationSubgraphs) {
    // Group nodes by generation, sort higher generations first (top of diagram)
    const byGen = new Map<number, PositionedNode[]>()
    for (const node of nodes) {
      const list = byGen.get(node.generation) ?? []
      list.push(node)
      byGen.set(node.generation, list)
    }
    const sortedGens = [...byGen.keys()].sort((a, b) => b - a)

    for (const gen of sortedGens) {
      // Sort nodes within each generation by x position so Mermaid's LR ordering matches layout
      const rowNodes = byGen.get(gen)!.slice().sort((a, b) => a.x - b.x)
      const sgId = subgraphId(gen)

      lines.push(`  subgraph ${sgId}["${generationLabel(gen)}"]`)
      lines.push('    direction LR')
      for (const node of rowNodes) {
        lines.push(`    ${node.id}["${buildNodeLabel(node, cfg.labelFormat)}"]`)
      }
      lines.push('  end')
    }
  } else {
    // Flat node list, sorted by generation desc then x asc for predictable output
    const sorted = nodes.slice().sort((a, b) => b.generation - a.generation || a.x - b.x)
    for (const node of sorted) {
      lines.push(`  ${node.id}["${buildNodeLabel(node, cfg.labelFormat)}"]`)
    }
  }

  // ── edge declarations ────────────────────────────────────────────────────

  if (edges.length > 0) {
    lines.push('')
    for (const edge of edges) {
      lines.push(buildEdgeLine(edge, cfg.showEdgeLabels))
    }
  }

  // ── status styling ───────────────────────────────────────────────────────

  const deceasedIds = nodes.filter((n) => n.status === 'deceased').map((n) => n.id)
  const missingIds  = nodes.filter((n) => n.status === 'missing').map((n) => n.id)

  if (deceasedIds.length > 0 || missingIds.length > 0) {
    lines.push('')
    if (deceasedIds.length > 0) {
      lines.push('  classDef deceased fill:#888,stroke:#555,color:#fff,stroke-dasharray:4')
      lines.push(`  class ${deceasedIds.join(',')} deceased`)
    }
    if (missingIds.length > 0) {
      lines.push('  classDef missing fill:#ccc,stroke:#999,color:#333,stroke-dasharray:8')
      lines.push(`  class ${missingIds.join(',')} missing`)
    }
  }

  return lines.join('\n') + '\n'
}
