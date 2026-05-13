import { createToken, Lexer } from 'chevrotain'

export const Comment = createToken({
  name: 'Comment',
  pattern: /%%[^\n]*/,
  group: Lexer.SKIPPED,
})

export const Newline = createToken({
  name: 'Newline',
  pattern: /\r?\n/,
  group: Lexer.SKIPPED,
})

export const WhiteSpace = createToken({
  name: 'WhiteSpace',
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED,
})

// Arrows — more specific patterns first to avoid partial matches
export const Arrow_Double = createToken({ name: 'Arrow_Double', pattern: /==>/ })
export const Arrow_Dashed = createToken({ name: 'Arrow_Dashed', pattern: /-\.->/ })
export const Arrow_Standard = createToken({ name: 'Arrow_Standard', pattern: /-->/ })
export const Arrow_Undirected = createToken({ name: 'Arrow_Undirected', pattern: /---/ })

export const LSquare = createToken({ name: 'LSquare', pattern: /\[/ })
export const RSquare = createToken({ name: 'RSquare', pattern: /\]/ })
export const Pipe = createToken({ name: 'Pipe', pattern: /\|/ })
export const QuotedString = createToken({ name: 'QuotedString', pattern: /"[^"]*"/ })
export const Identifier = createToken({ name: 'Identifier', pattern: /[A-Za-z_][A-Za-z0-9_]*/ })

// Token order determines matching priority — keep Arrows before Identifier
export const ALL_TOKENS = [
  Comment,
  Newline,
  WhiteSpace,
  Arrow_Double,
  Arrow_Dashed,
  Arrow_Standard,
  Arrow_Undirected,
  LSquare,
  RSquare,
  Pipe,
  QuotedString,
  Identifier,
]

export const famLexer = new Lexer(ALL_TOKENS, { recoveryEnabled: false })

export function lex(source: string) {
  return famLexer.tokenize(source)
}
