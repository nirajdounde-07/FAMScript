export interface FamRuntime {
  highlightPath(fromId: string, toId: string): void
  expandBranch(nodeId: string): void
  collapseBranch(nodeId: string): void
  search(query: string): string[]
  zoomTo(nodeId: string): void
}
