/**
 * 🌸 TinyLisp Reader
 *
 * Parses s-expressions into Lisp values
 * Supports: symbols, numbers, strings, lists, quotes, quasiquote
 */

import { LispVal, sym, NIL, list, cons, LispSymbol } from './types.js';

// Token types
type Token =
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'lbracket' }
  | { type: 'rbracket' }
  | { type: 'quote' }
  | { type: 'quasiquote' }
  | { type: 'unquote' }
  | { type: 'unquote-splicing' }
  | { type: 'dot' }
  | { type: 'number'; value: number }
  | { type: 'string'; value: string }
  | { type: 'symbol'; value: string };

class Lexer {
  private pos = 0;

  constructor(private input: string) {}

  peek(): string | undefined {
    return this.input[this.pos];
  }

  advance(): string {
    return this.input[this.pos++];
  }

  skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.advance();
      } else if (ch === ';') {
        // Skip comments until end of line
        while (this.peek() && this.peek() !== '\n') {
          this.advance();
        }
      } else {
        break;
      }
    }
  }

  isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9';
  }

  isSymbolChar(ch: string): boolean {
    return (
      ch !== undefined &&
      ch !== ' ' &&
      ch !== '\t' &&
      ch !== '\n' &&
      ch !== '\r' &&
      ch !== '(' &&
      ch !== ')' &&
      ch !== '[' &&
      ch !== ']' &&
      ch !== '"' &&
      ch !== "'" &&
      ch !== '`' &&
      ch !== ',' &&
      ch !== ';'
    );
  }

  readString(): string {
    let str = '';
    this.advance(); // skip opening quote
    while (this.peek() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n': str += '\n'; break;
          case 't': str += '\t'; break;
          case 'r': str += '\r'; break;
          case '"': str += '"'; break;
          case '\\': str += '\\'; break;
          default: str += escaped;
        }
      } else {
        str += this.advance();
      }
    }
    if (this.peek() === '"') this.advance(); // skip closing quote
    return str;
  }

  readSymbolOrNumber(): Token {
    let str = '';
    while (this.isSymbolChar(this.peek()!)) {
      str += this.advance();
    }

    // Check if it's a number
    if (/^-?\d+(\.\d+)?$/.test(str)) {
      return { type: 'number', value: parseFloat(str) };
    }

    // Special case for dot
    if (str === '.') {
      return { type: 'dot' };
    }

    return { type: 'symbol', value: str };
  }

  nextToken(): Token | null {
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;

    const ch = this.peek()!;

    switch (ch) {
      case '(':
        this.advance();
        return { type: 'lparen' };
      case ')':
        this.advance();
        return { type: 'rparen' };
      case '[':
        this.advance();
        return { type: 'lbracket' };
      case ']':
        this.advance();
        return { type: 'rbracket' };
      case "'":
        this.advance();
        return { type: 'quote' };
      case '`':
        this.advance();
        return { type: 'quasiquote' };
      case ',':
        this.advance();
        if (this.peek() === '@') {
          this.advance();
          return { type: 'unquote-splicing' };
        }
        return { type: 'unquote' };
      case '"':
        return { type: 'string', value: this.readString() };
      default:
        return this.readSymbolOrNumber();
    }
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];
    let tok: Token | null;
    while ((tok = this.nextToken())) {
      tokens.push(tok);
    }
    return tokens;
  }
}

class Parser {
  private pos = 0;

  constructor(private tokens: Token[]) {}

  peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  advance(): Token {
    return this.tokens[this.pos++];
  }

  parse(): LispVal {
    const tok = this.advance();
    if (!tok) throw new Error('Unexpected end of input');

    switch (tok.type) {
      case 'number':
        return tok.value;
      case 'string':
        return tok.value;
      case 'symbol':
        if (tok.value === 'nil') return NIL;
        if (tok.value === 'true' || tok.value === 't') return sym('t');
        if (tok.value === 'false') return NIL;
        return sym(tok.value);

      case 'quote':
        return list(sym('quote'), this.parse());
      case 'quasiquote':
        return list(sym('quasiquote'), this.parse());
      case 'unquote':
        return list(sym('unquote'), this.parse());
      case 'unquote-splicing':
        return list(sym('unquote-splicing'), this.parse());

      case 'lparen':
        return this.parseList('rparen');
      case 'lbracket':
        // [a b c] is sugar for (vector a b c)
        return cons(sym('vector'), this.parseList('rbracket'));

      case 'rparen':
      case 'rbracket':
        throw new Error('Unexpected closing bracket');

      case 'dot':
        throw new Error('Unexpected dot');

      default:
        throw new Error(`Unknown token: ${JSON.stringify(tok)}`);
    }
  }

  parseList(endType: 'rparen' | 'rbracket'): LispVal {
    const items: LispVal[] = [];
    let dotted: LispVal | null = null;

    while (this.peek() && this.peek()!.type !== endType) {
      if (this.peek()!.type === 'dot') {
        this.advance(); // skip dot
        dotted = this.parse();
        break;
      }
      items.push(this.parse());
    }

    if (!this.peek()) {
      throw new Error(`Expected ${endType === 'rparen' ? ')' : ']'}`);
    }
    this.advance(); // skip closing bracket

    // Build the list
    let result: LispVal = dotted ?? NIL;
    for (let i = items.length - 1; i >= 0; i--) {
      result = cons(items[i], result);
    }
    return result;
  }

  parseAll(): LispVal[] {
    const exprs: LispVal[] = [];
    while (this.pos < this.tokens.length) {
      exprs.push(this.parse());
    }
    return exprs;
  }
}

// Main read function
export function read(input: string): LispVal {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  if (tokens.length === 0) return NIL;
  const parser = new Parser(tokens);
  return parser.parse();
}

// Read all expressions in input
export function readAll(input: string): LispVal[] {
  const lexer = new Lexer(input);
  const tokens = lexer.tokenize();
  if (tokens.length === 0) return [];
  const parser = new Parser(tokens);
  return parser.parseAll();
}

// Check if input is complete (balanced parens)
export function isComplete(input: string): boolean {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (const ch of input) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
  }

  return depth <= 0 && !inString;
}
