import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'url'

// Resolve workspace siblings to their TypeScript source so tests never
// need a prior build step. Production builds still go through dist/.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@famscript/parser': fileURLToPath(new URL('../parser/src/index.ts', import.meta.url)),
      '@famscript/validator': fileURLToPath(new URL('../validator/src/index.ts', import.meta.url)),
      '@famscript/layout': fileURLToPath(new URL('../layout/src/index.ts', import.meta.url)),
      '@famscript/renderer-mermaid': fileURLToPath(new URL('../renderer-mermaid/src/index.ts', import.meta.url)),
    },
  },
})
