export interface GenerationStyle {
  backgroundColor?: string
  borderColor?: string
  textColor?: string
}

export interface EdgeStyle {
  color?: string
  strokeWidth?: number
  dashArray?: string
}

export interface FamTheme {
  generation: Record<string, GenerationStyle>
  edges: Record<string, EdgeStyle>
  typography: {
    fontFamily?: string
    fontSize?: number
  }
  spacing: {
    nodeGap?: number
    generationGap?: number
  }
}
