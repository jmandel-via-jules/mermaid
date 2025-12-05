/**
 * 🌸 TinyLisp - A cute Lisp interpreter for TypeScript
 *
 * Core value types representing the Lisp universe
 */

// Symbol - the atoms of Lisp
export class LispSymbol {
  readonly type = 'symbol' as const;
  constructor(public readonly name: string) {}
  toString() { return this.name; }
}

// Interned symbol table for fast equality
const symbolTable = new Map<string, LispSymbol>();
export function sym(name: string): LispSymbol {
  let s = symbolTable.get(name);
  if (!s) {
    s = new LispSymbol(name);
    symbolTable.set(name, s);
  }
  return s;
}

// The sacred nil
export const NIL = sym('nil');
export const TRUE = sym('t');

// Cons cell - the building block of lists
export class Cons {
  readonly type = 'cons' as const;
  constructor(
    public car: LispVal,
    public cdr: LispVal
  ) {}

  toString(): string {
    return `(${consToString(this)})`;
  }
}

function consToString(c: Cons): string {
  const parts: string[] = [printVal(c.car)];
  let tail: LispVal = c.cdr;

  while (tail instanceof Cons) {
    parts.push(printVal(tail.car));
    tail = tail.cdr;
  }

  if (tail !== NIL) {
    parts.push('.');
    parts.push(printVal(tail));
  }

  return parts.join(' ');
}

// Lambda - user-defined functions
export class Lambda {
  readonly type = 'lambda' as const;
  constructor(
    public params: LispSymbol[],
    public body: LispVal[],
    public env: Environment,
    public rest?: LispSymbol // &rest parameter
  ) {}
  toString() { return '#<lambda>'; }
}

// Macro - code transformers
export class Macro {
  readonly type = 'macro' as const;
  constructor(
    public params: LispSymbol[],
    public body: LispVal[],
    public env: Environment,
    public rest?: LispSymbol
  ) {}
  toString() { return '#<macro>'; }
}

// Native function - TypeScript functions exposed to Lisp
export class NativeFn {
  readonly type = 'native' as const;
  constructor(
    public name: string,
    public fn: (...args: LispVal[]) => LispVal
  ) {}
  toString() { return `#<native:${this.name}>`; }
}

// JS interop wrapper - wraps arbitrary JS values
export class JSValue {
  readonly type = 'jsvalue' as const;
  constructor(public value: unknown) {}
  toString() {
    if (typeof this.value === 'function') return '#<js:function>';
    if (typeof this.value === 'object') return `#<js:${this.value?.constructor?.name ?? 'object'}>`;
    return `#<js:${typeof this.value}>`;
  }
}

// All possible Lisp values
export type LispVal =
  | LispSymbol
  | Cons
  | Lambda
  | Macro
  | NativeFn
  | JSValue
  | number
  | string
  | boolean;

// Environment for variable bindings
export class Environment {
  private bindings = new Map<string, LispVal>();

  constructor(public parent?: Environment) {}

  // Define a new binding in current scope
  def(name: string | LispSymbol, value: LispVal): LispVal {
    const key = typeof name === 'string' ? name : name.name;
    this.bindings.set(key, value);
    return value;
  }

  // Set an existing binding (searches up scope chain)
  set(name: string | LispSymbol, value: LispVal): LispVal {
    const key = typeof name === 'string' ? name : name.name;
    const env = this.findEnv(key);
    if (!env) throw new Error(`Undefined variable: ${key}`);
    env.bindings.set(key, value);
    return value;
  }

  // Lookup a binding
  get(name: string | LispSymbol): LispVal {
    const key = typeof name === 'string' ? name : name.name;
    const env = this.findEnv(key);
    if (!env) throw new Error(`Undefined variable: ${key}`);
    return env.bindings.get(key)!;
  }

  // Check if binding exists
  has(name: string | LispSymbol): boolean {
    const key = typeof name === 'string' ? name : name.name;
    return this.findEnv(key) !== undefined;
  }

  // Find the environment containing a binding
  private findEnv(name: string): Environment | undefined {
    if (this.bindings.has(name)) return this;
    if (this.parent) return this.parent.findEnv(name);
    return undefined;
  }

  // Create a child environment
  extend(): Environment {
    return new Environment(this);
  }
}

// Helper to check if something is nil/empty
export function isNil(v: LispVal): boolean {
  return v === NIL || v === null || v === undefined;
}

// Helper to check truthiness (only nil and false are falsy)
export function isTruthy(v: LispVal): boolean {
  return v !== NIL && v !== false;
}

// List construction helpers
export function list(...items: LispVal[]): LispVal {
  let result: LispVal = NIL;
  for (let i = items.length - 1; i >= 0; i--) {
    result = new Cons(items[i], result);
  }
  return result;
}

export function cons(car: LispVal, cdr: LispVal): Cons {
  return new Cons(car, cdr);
}

// Convert list to array
export function toArray(val: LispVal): LispVal[] {
  const result: LispVal[] = [];
  let current = val;
  while (current instanceof Cons) {
    result.push(current.car);
    current = current.cdr;
  }
  return result;
}

// Pretty print a value
export function printVal(val: LispVal): string {
  if (val === NIL) return 'nil';
  if (val === TRUE) return 't';
  if (val instanceof LispSymbol) return val.name;
  if (val instanceof Cons) return val.toString();
  if (val instanceof Lambda) return '#<lambda>';
  if (val instanceof Macro) return '#<macro>';
  if (val instanceof NativeFn) return val.toString();
  if (val instanceof JSValue) return val.toString();
  if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 't' : 'nil';
  return String(val);
}
