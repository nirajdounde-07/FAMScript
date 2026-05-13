import type { FamScriptAST } from '@famscript/parser'
import type { LayoutConfig, LayoutResult, PositionedNode } from './types.js'

// ─── internal slot types ─────────────────────────────────────────────────────

type SingleSlot = { kind: 'single'; id: string }
type PairSlot = { kind: 'pair'; leftId: string; rightId: string }
type Slot = SingleSlot | PairSlot

function slotIds(slot: Slot): string[] {
  return slot.kind === 'single' ? [slot.id] : [slot.leftId, slot.rightId]
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildInitialSlots(ids: string[], spouseOf: Map<string, string>): Slot[] {
  const placed = new Set<string>()
  const slots: Slot[] = []
  const idSet = new Set(ids)

  for (const id of ids) {
    if (placed.has(id)) continue
    const spouse = spouseOf.get(id)
    if (spouse && idSet.has(spouse) && !placed.has(spouse)) {
      slots.push({ kind: 'pair', leftId: id, rightId: spouse })
      placed.add(id)
      placed.add(spouse)
    } else {
      slots.push({ kind: 'single', id })
      placed.add(id)
    }
  }
  return slots
}

// Assign fractional column positions to every node (used for barycenter computation).
function assignColPositions(slots: Slot[], colPos: Map<string, number>): void {
  let col = 0
  for (const slot of slots) {
    if (slot.kind === 'single') {
      colPos.set(slot.id, col)
      col += 1
    } else {
      colPos.set(slot.leftId, col)
      colPos.set(slot.rightId, col + 0.5)
      col += 2
    }
  }
}

// Reorder slots in-place using the barycenter of their neighbours in an adjacent row.
// getNeighbourPositions(nodeId) → array of column positions of that node's neighbours.
function reorderByBarycenter(
  slots: Slot[],
  getNeighbourPositions: (id: string) => number[],
): void {
  const ranked = slots.map((slot) => {
    const positions = slotIds(slot).flatMap(getNeighbourPositions)
    const bc =
      positions.length > 0
        ? positions.reduce((a, b) => a + b, 0) / positions.length
        : Infinity
    return { slot, bc }
  })
  ranked.sort((a, b) => a.bc - b.bc)
  slots.splice(0, slots.length, ...ranked.map((r) => r.slot))
}

// Compute the pixel width occupied by a row.
function rowPixelWidth(slots: Slot[], nodeWidth: number, hGap: number, pairGap: number): number {
  if (slots.length === 0) return 0
  let width = 0
  for (const slot of slots) {
    if (slot.kind === 'single') {
      width += nodeWidth + hGap
    } else {
      width += nodeWidth + pairGap + nodeWidth + hGap
    }
  }
  return width - hGap // no trailing gap
}

// ─── public API ──────────────────────────────────────────────────────────────

const DEFAULTS: Required<LayoutConfig> = {
  nodeWidth: 160,
  nodeHeight: 60,
  horizontalGap: 40,
  verticalGap: 80,
  pairGap: 8,
}

export function computeLayout(
  ast: FamScriptAST,
  config: Partial<LayoutConfig> = {},
): LayoutResult {
  const cfg: Required<LayoutConfig> = { ...DEFAULTS, ...config }
  const { nodes, edges } = ast

  if (nodes.length === 0) {
    return { nodes: [], edges, width: 0, height: 0 }
  }

  // ── 1. Build adjacency maps ───────────────────────────────────────────────

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
  for (const edge of edges) {
    if (edge.type !== 'parent_child') continue
    const ch = childrenOf.get(edge.from) ?? []
    ch.push(edge.to)
    childrenOf.set(edge.from, ch)
    const par = parentsOf.get(edge.to) ?? []
    par.push(edge.from)
    parentsOf.set(edge.to, par)
  }

  const spouseOf = new Map<string, string>()
  for (const edge of edges) {
    if (edge.type !== 'married' && edge.type !== 'core_couple') continue
    // Only pair spouses on the same generation (V2 may not have run)
    const a = nodeById.get(edge.from)
    const b = nodeById.get(edge.to)
    if (a && b && a.generation === b.generation) {
      spouseOf.set(edge.from, edge.to)
      spouseOf.set(edge.to, edge.from)
    }
  }

  // ── 2. Build sorted generation list and initial slot ordering ────────────

  // Higher generation number = earlier (top) row. e.g. G+3 (=3) → row 0.
  const sortedGens = [...new Set(nodes.map((n) => n.generation))].sort((a, b) => b - a)
  const rowOfGen = new Map(sortedGens.map((g, i) => [g, i]))

  const nodesByGen = new Map<number, string[]>()
  for (const node of nodes) {
    const list = nodesByGen.get(node.generation) ?? []
    list.push(node.id)
    nodesByGen.set(node.generation, list)
  }

  const rowSlots = new Map<number, Slot[]>()
  for (const gen of sortedGens) {
    rowSlots.set(gen, buildInitialSlots(nodesByGen.get(gen)!, spouseOf))
  }

  // ── 3. Barycenter crossing minimisation (top-down then bottom-up) ─────────

  const colPos = new Map<string, number>()
  for (const gen of sortedGens) {
    assignColPositions(rowSlots.get(gen)!, colPos)
  }

  // Top-down: order each row by barycenter of parents above
  for (let i = 1; i < sortedGens.length; i++) {
    const gen = sortedGens[i]!
    const slots = rowSlots.get(gen)!
    reorderByBarycenter(slots, (id) => (parentsOf.get(id) ?? []).map((p) => colPos.get(p) ?? 0))
    assignColPositions(slots, colPos)
  }

  // Bottom-up: order each row by barycenter of children below
  for (let i = sortedGens.length - 2; i >= 0; i--) {
    const gen = sortedGens[i]!
    const slots = rowSlots.get(gen)!
    reorderByBarycenter(slots, (id) => (childrenOf.get(id) ?? []).map((c) => colPos.get(c) ?? 0))
    assignColPositions(slots, colPos)
  }

  // ── 4. Compute pixel coordinates ─────────────────────────────────────────

  const { nodeWidth, nodeHeight, horizontalGap, verticalGap, pairGap } = cfg
  const unitH = nodeHeight + verticalGap

  // Determine the maximum row pixel width to use as the canvas width
  let maxRowWidth = 0
  for (const gen of sortedGens) {
    const w = rowPixelWidth(rowSlots.get(gen)!, nodeWidth, horizontalGap, pairGap)
    if (w > maxRowWidth) maxRowWidth = w
  }

  const positionedNodes: PositionedNode[] = []

  for (const gen of sortedGens) {
    const row = rowOfGen.get(gen)!
    const y = row * unitH
    const slots = rowSlots.get(gen)!

    // Place nodes left-to-right within this row
    let cursor = 0
    const placed: Array<{ id: string; x: number }> = []

    for (const slot of slots) {
      if (slot.kind === 'single') {
        placed.push({ id: slot.id, x: cursor })
        cursor += nodeWidth + horizontalGap
      } else {
        placed.push({ id: slot.leftId, x: cursor })
        placed.push({ id: slot.rightId, x: cursor + nodeWidth + pairGap })
        cursor += nodeWidth + pairGap + nodeWidth + horizontalGap
      }
    }

    // Centre this row within the canvas
    const thisRowWidth = cursor > 0 ? cursor - horizontalGap : 0
    const rowOffset = Math.round((maxRowWidth - thisRowWidth) / 2)

    for (const { id, x } of placed) {
      const node = nodeById.get(id)!
      positionedNodes.push({ ...node, x: x + rowOffset, y, row })
    }
  }

  const totalWidth =
    maxRowWidth > 0 ? maxRowWidth : nodeWidth
  const totalHeight =
    sortedGens.length > 0
      ? (sortedGens.length - 1) * unitH + nodeHeight
      : nodeHeight

  return {
    nodes: positionedNodes,
    edges,
    width: totalWidth,
    height: totalHeight,
  }
}
