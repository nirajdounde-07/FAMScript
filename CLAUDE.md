# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FamScript is a declarative DSL and compiler framework for genealogy and human relationship diagrams. It compiles `.fam` source files into Mermaid-native visualizations. It is **not** a UI library — it is a compiler ecosystem with separate packages for parsing, validation, layout, rendering, and framework adapters.

The source documents defining this project are:
- `FamScript Specification Sheet.pdf` — product vision, relationship types, rendering philosophy
- `Product Requirements Document (PRD) FAMScript.pdf` — syntax spec, package architecture, tech stack

## Intended Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Parser | Chevrotain |
| Validation | Zod |
| Graph Engine | graphology + graphlib |
| Layout | elkjs + dagre |
| Renderer | Mermaid.js |
| Frontend | React + Next.js |
| Editor (playground) | Monaco |
| State | Zustand |
| Export | Puppeteer + sharp |
| Docs | Docusaurus |
| Testing | Vitest + Playwright |
| Build | tsup |
| Monorepo | Turborepo + pnpm |
| CI/CD | GitHub Actions |

## Monorepo Structure

```
famscript/
├── packages/
│   ├── core            # Orchestrates full compile pipeline
│   ├── parser          # Chevrotain tokenizer + parser → AST
│   ├── validator       # Structural + semantic validation rules
│   ├── layout          # Generation layering, position calc, edge routing (elkjs/dagre)
│   ├── renderer-mermaid # AST → Mermaid syntax string
│   ├── runtime         # Live updates, zoom/pan, search, highlighting
│   ├── export          # SVG/PNG/PDF/JSON/GEDCOM export adapters
│   ├── themes          # Theme API (generation styles, edge styles, typography)
│   ├── cli             # famscript CLI
│   ├── react           # @famscript/react adapter
│   ├── vue             # @famscript/vue adapter
│   ├── angular         # @famscript/angular adapter
│   └── ai              # NLP/OCR/RAG features (Phase 3)
├── playground          # Next.js app with Monaco editor + live Mermaid rendering
├── docs                # Docusaurus site
├── examples
└── website
```

## Build & Dev Commands

Once scaffolded, the intended commands are:

```bash
pnpm install                          # Install all workspace dependencies
pnpm build                            # Build all packages via Turborepo
pnpm dev                              # Start playground dev server
pnpm test                             # Run all Vitest unit tests
pnpm test --filter @famscript/parser  # Run tests for a single package
pnpm lint                             # Lint all packages
```

CLI (from `packages/cli`):
```bash
famscript render tree.fam             # Compile and render
famscript validate tree.fam           # Run validation only
famscript export tree.fam --pdf       # Export to PDF
famscript dev                         # Watch mode
famscript lint                        # Lint .fam file
```

## Compiler Pipeline

The single most important architecture constraint: **FamScript must compile to Mermaid, never render to DOM directly.**

```
.fam source
  → Tokenizer (Chevrotain)
  → Parser → AST
  → Validation Engine
  → Graph Engine (graphology)
  → Layout Engine (elkjs + dagre)
  → Mermaid Generator
  → SVG Renderer (Mermaid.js)
  → Export Adapters
```

Keep `parser`, `validator`, `layout`, `renderer`, `runtime`, and `ui` as strictly separate packages. This is what makes FamScript a framework rather than a UI component.

## FamScript Syntax

**Node syntax:**
```
ID["Name | Age | Gender | Generation | Status"]
```

**Examples:**
```
GROOM_SLF_001["Arjun Kumar | 28 | M | G0"]
F_SLF_001["Ramesh Kumar | 55 | M | G+1"]
GGF_PAT_001["Ram Das | 104 | M | G+3 | deceased"]
UNK_MAT_001["Unknown | ? | ? | G+2"]
```

**Relationship edges:**
```
F_SLF_001 -->|"Father of"| GROOM_SLF_001       # Parent → Child
F_SLF_001 ---|"Married to"| M_SLF_001           # Spouse
GROOM_SLF_001 ==>|"Married to"| BRIDE_SLF_001  # Core couple
A -.-> B                                         # Distant / Step / Foster
```

**Generation scale:**
- `G+3` Great-grandparents → `G+2` Grandparents → `G+1` Parents → `G0` Self → `G-1` Children → `G-2` Grandchildren

**File extensions:** `.fam` (source), `.famconfig` (config), `.famplugin` (plugin), `.famcache` (compiled cache)

## Validation Rules

The validator (`@famscript/validator`) enforces these gates in order:

| Rule | Constraint |
|---|---|
| V1 Age Gap | `parent.age >= child.age + 15` |
| V2 Spouse Parity | Spouses must share the same generation |
| V3 Gender Role | Father/Groom → M, Mother/Bride → F; unknown uses `?` |
| V4 Duplicate Detection | No duplicate person ID within same generation |
| V5 Circular Relation | No person may be their own ancestor (DFS cycle check) |
| V6 Sibling Parity | Siblings share the same generation level |
| V7 In-Law Generation | In-laws stay on spouse's generation |
| V8 Cousin Parity | Cousins align to the same generation layer |

Custom validators use: `validator.addRule({ name, validate(graph) {} })`

## Layout Rules

The layout engine must enforce:
- Same generation → same horizontal row
- Spouse horizontal pairing (adjacent nodes)
- Older generations above, younger below, current generation centered
- Minimize edge crossings; no force-directed or organic layouts
- Orphan branches isolated; central anchoring for primary node

## Core TypeScript Interfaces

```ts
interface PersonNode {
  id: string
  name: string
  gender: string      // "M" | "F" | "?"
  generation: number  // numeric (0 = G0, 1 = G+1, -1 = G-1, etc.)
  metadata: Record<string, unknown>
}

interface RelationEdge {
  from: string
  to: string
  type: string        // "parent_of" | "married_to" | "sibling_of" etc.
}
```

## Plugin System

```ts
createFamScript({
  plugins: [
    relationshipPlugin(),
    marriagePlugin(),
    timelinePlugin(),
    analyticsPlugin()
  ]
})
```

## Theme API

```ts
createTheme({
  generation: {},
  edges: {},
  typography: {},
  spacing: {}
})
```

## Testing Approach

- **Unit tests** (Vitest): parser correctness, validator rule enforcement, layout position output
- **E2E tests** (Playwright): playground editor → rendered SVG output
- **UI tests** (Testing Library): React/Vue adapter components
- **Visual regression** (Chromatic): rendered diagram snapshots

## V1 Non-Goals

Do not implement in Version 1: AI relationship prediction, 3D rendering, real-time collaboration, VR visualization, social networking features.

## Key Design Invariant

FamScript prioritizes **structure over chaos**: straight lines, sharp edges, consistent spacing, no organic force-directed layouts. Every layout decision should produce the same output deterministically given the same input.
