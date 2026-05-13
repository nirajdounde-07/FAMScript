export interface RenderConfig {
  /** Mermaid graph direction. Default: 'TD' */
  direction: 'TD' | 'LR' | 'BT' | 'RL'
  /** Wrap each generation in a subgraph so Mermaid respects the row structure. Default: true */
  showGenerationSubgraphs: boolean
  /** Emit edge labels when present on the RelationEdge. Default: true */
  showEdgeLabels: boolean
  /** Controls how much information appears in node labels. Default: 'full' */
  labelFormat: 'full' | 'name-only' | 'name-age'
}
