export interface PersonNode {
  id: string
  name: string
  age?: number
  gender: 'M' | 'F' | '?'
  generation: number
  status?: 'living' | 'deceased' | 'missing' | 'unknown'
  metadata: Record<string, unknown>
}

export interface RelationEdge {
  from: string
  to: string
  type: string
  label?: string
  certainty?: 'confirmed' | 'assumed' | 'disputed' | 'historical_estimate'
}

export interface FamScriptAST {
  nodes: PersonNode[]
  edges: RelationEdge[]
}
