import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'url'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@famscript/core':             fileURLToPath(new URL('../core/src/index.ts',             import.meta.url)),
      '@famscript/parser':           fileURLToPath(new URL('../parser/src/index.ts',           import.meta.url)),
      '@famscript/validator':        fileURLToPath(new URL('../validator/src/index.ts',        import.meta.url)),
      '@famscript/layout':           fileURLToPath(new URL('../layout/src/index.ts',           import.meta.url)),
      '@famscript/renderer-mermaid': fileURLToPath(new URL('../renderer-mermaid/src/index.ts', import.meta.url)),
    },
  },
})
