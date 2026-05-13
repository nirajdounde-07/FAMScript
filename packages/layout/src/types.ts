import type { PersonNode, RelationEdge } from '@famscript/parser'

export interface LayoutConfig {
  nodeWidth: number
  nodeHeight: number
  horizontalGap: number
  verticalGap: number
  pairGap: number
}

export interface PositionedNode extends PersonNode {
  x: number
  y: number
  row: number
}

export interface LayoutResult {
  nodes: PositionedNode[]
  edges: RelationEdge[]
  width: number
  height: number
}
