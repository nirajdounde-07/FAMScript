import type { FamTheme } from './types.js'

export const defaultTheme: FamTheme = {
  generation: {},
  edges: {},
  typography: { fontFamily: 'Inter, sans-serif', fontSize: 14 },
  spacing: { nodeGap: 40, generationGap: 80 },
}

export function createTheme(overrides: Partial<FamTheme>): FamTheme {
  return {
    ...defaultTheme,
    ...overrides,
    generation: { ...defaultTheme.generation, ...overrides.generation },
    edges: { ...defaultTheme.edges, ...overrides.edges },
    typography: { ...defaultTheme.typography, ...overrides.typography },
    spacing: { ...defaultTheme.spacing, ...overrides.spacing },
  }
}
