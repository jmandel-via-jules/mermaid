/**
 * 🌸 TinyLisp Built-in Functions
 *
 * Core functions available in the global environment
 */

import {
  LispVal,
  LispSymbol,
  Cons,
  Lambda,
  Macro,
  NativeFn,
  JSValue,
  Environment,
  NIL,
  TRUE,
  sym,
  cons,
  list,
  toArray,
  isNil,
  isTruthy,
  printVal,
} from './types.js';
import { evaluate, toLispJS, fromJS } from './eval.js';

// Create a native function
function native(
  name: string,
  fn: (...args: LispVal[]) => LispVal
): NativeFn {
  return new NativeFn(name, fn);
}

// Type checking helpers
function assertNumber(val: LispVal, name: string): number {
  if (typeof val !== 'number') {
    throw new Error(`${name}: expected number, got ${printVal(val)}`);
  }
  return val;
}

function assertString(val: LispVal, name: string): string {
  if (typeof val !== 'string') {
    throw new Error(`${name}: expected string, got ${printVal(val)}`);
  }
  return val;
}

function assertList(val: LispVal, name: string): Cons {
  if (!(val instanceof Cons)) {
    throw new Error(`${name}: expected list, got ${printVal(val)}`);
  }
  return val;
}

function assertSymbol(val: LispVal, name: string): LispSymbol {
  if (!(val instanceof LispSymbol)) {
    throw new Error(`${name}: expected symbol, got ${printVal(val)}`);
  }
  return val;
}

function assertFunction(val: LispVal, name: string): Lambda | NativeFn {
  if (!(val instanceof Lambda) && !(val instanceof NativeFn)) {
    throw new Error(`${name}: expected function, got ${printVal(val)}`);
  }
  return val;
}

// Create the standard environment with all builtins
export function createEnv(): Environment {
  const env = new Environment();

  // === Core Lisp Functions ===

  // List operations
  env.def('cons', native('cons', (a, b) => cons(a, b)));
  env.def('car', native('car', (x) => (x instanceof Cons ? x.car : NIL)));
  env.def('cdr', native('cdr', (x) => (x instanceof Cons ? x.cdr : NIL)));
  env.def('first', native('first', (x) => (x instanceof Cons ? x.car : NIL)));
  env.def('rest', native('rest', (x) => (x instanceof Cons ? x.cdr : NIL)));
  env.def('head', native('head', (x) => (x instanceof Cons ? x.car : NIL)));
  env.def('tail', native('tail', (x) => (x instanceof Cons ? x.cdr : NIL)));

  env.def('list', native('list', (...args) => list(...args)));
  env.def('list?', native('list?', (x) => (x instanceof Cons ? TRUE : NIL)));
  env.def('null?', native('null?', (x) => (isNil(x) ? TRUE : NIL)));
  env.def('nil?', native('nil?', (x) => (isNil(x) ? TRUE : NIL)));
  env.def('empty?', native('empty?', (x) => (isNil(x) ? TRUE : NIL)));

  env.def(
    'length',
    native('length', (x) => {
      let count = 0;
      let current = x;
      while (current instanceof Cons) {
        count++;
        current = current.cdr;
      }
      return count;
    })
  );

  env.def(
    'nth',
    native('nth', (lst, n) => {
      assertNumber(n, 'nth');
      let current = lst;
      let i = 0;
      while (current instanceof Cons) {
        if (i === n) return current.car;
        current = current.cdr;
        i++;
      }
      return NIL;
    })
  );

  env.def(
    'last',
    native('last', (lst) => {
      if (!(lst instanceof Cons)) return NIL;
      let current = lst;
      while (current.cdr instanceof Cons) {
        current = current.cdr;
      }
      return current.car;
    })
  );

  env.def(
    'append',
    native('append', (...lists) => {
      const result: LispVal[] = [];
      for (const lst of lists) {
        result.push(...toArray(lst));
      }
      return list(...result);
    })
  );

  env.def(
    'reverse',
    native('reverse', (lst) => {
      return list(...toArray(lst).reverse());
    })
  );

  env.def(
    'concat',
    native('concat', (...lists) => {
      const result: LispVal[] = [];
      for (const lst of lists) {
        result.push(...toArray(lst));
      }
      return list(...result);
    })
  );

  // === Arithmetic ===

  env.def(
    '+',
    native('+', (...args) => {
      return args.reduce((a: number, b) => a + assertNumber(b, '+'), 0);
    })
  );

  env.def(
    '-',
    native('-', (...args) => {
      if (args.length === 0) return 0;
      if (args.length === 1) return -assertNumber(args[0], '-');
      const first = assertNumber(args[0], '-');
      return args.slice(1).reduce((a: number, b) => a - assertNumber(b, '-'), first);
    })
  );

  env.def(
    '*',
    native('*', (...args) => {
      return args.reduce((a: number, b) => a * assertNumber(b, '*'), 1);
    })
  );

  env.def(
    '/',
    native('/', (...args) => {
      if (args.length === 0) return 1;
      if (args.length === 1) return 1 / assertNumber(args[0], '/');
      const first = assertNumber(args[0], '/');
      return args.slice(1).reduce((a: number, b) => a / assertNumber(b, '/'), first);
    })
  );

  env.def(
    'mod',
    native('mod', (a, b) => assertNumber(a, 'mod') % assertNumber(b, 'mod'))
  );
  env.def('%', native('%', (a, b) => assertNumber(a, '%') % assertNumber(b, '%')));

  env.def(
    'inc',
    native('inc', (x) => assertNumber(x, 'inc') + 1)
  );
  env.def(
    'dec',
    native('dec', (x) => assertNumber(x, 'dec') - 1)
  );

  env.def('abs', native('abs', (x) => Math.abs(assertNumber(x, 'abs'))));
  env.def('floor', native('floor', (x) => Math.floor(assertNumber(x, 'floor'))));
  env.def('ceil', native('ceil', (x) => Math.ceil(assertNumber(x, 'ceil'))));
  env.def('round', native('round', (x) => Math.round(assertNumber(x, 'round'))));
  env.def('sqrt', native('sqrt', (x) => Math.sqrt(assertNumber(x, 'sqrt'))));
  env.def('pow', native('pow', (a, b) =>
    Math.pow(assertNumber(a, 'pow'), assertNumber(b, 'pow'))
  ));
  env.def('min', native('min', (...args) => Math.min(...args.map((a) => assertNumber(a, 'min')))));
  env.def('max', native('max', (...args) => Math.max(...args.map((a) => assertNumber(a, 'max')))));
  env.def('random', native('random', () => Math.random()));

  // === Comparison ===

  env.def('=', native('=', (a, b) => (a === b ? TRUE : NIL)));
  env.def('eq?', native('eq?', (a, b) => (a === b ? TRUE : NIL)));
  env.def(
    'equal?',
    native('equal?', (a, b) => (deepEqual(a, b) ? TRUE : NIL))
  );
  env.def('<', native('<', (a, b) => (assertNumber(a, '<') < assertNumber(b, '<') ? TRUE : NIL)));
  env.def('>', native('>', (a, b) => (assertNumber(a, '>') > assertNumber(b, '>') ? TRUE : NIL)));
  env.def('<=', native('<=', (a, b) => (assertNumber(a, '<=') <= assertNumber(b, '<=') ? TRUE : NIL)));
  env.def('>=', native('>=', (a, b) => (assertNumber(a, '>=') >= assertNumber(b, '>=') ? TRUE : NIL)));

  // === Logical ===

  env.def('not', native('not', (x) => (isTruthy(x) ? NIL : TRUE)));

  // === Type Predicates ===

  env.def('number?', native('number?', (x) => (typeof x === 'number' ? TRUE : NIL)));
  env.def('string?', native('string?', (x) => (typeof x === 'string' ? TRUE : NIL)));
  env.def('symbol?', native('symbol?', (x) => (x instanceof LispSymbol ? TRUE : NIL)));
  env.def('fn?', native('fn?', (x) =>
    x instanceof Lambda || x instanceof NativeFn ? TRUE : NIL
  ));
  env.def('function?', native('function?', (x) =>
    x instanceof Lambda || x instanceof NativeFn ? TRUE : NIL
  ));
  env.def('macro?', native('macro?', (x) => (x instanceof Macro ? TRUE : NIL)));
  env.def('cons?', native('cons?', (x) => (x instanceof Cons ? TRUE : NIL)));
  env.def('pair?', native('pair?', (x) => (x instanceof Cons ? TRUE : NIL)));
  env.def('js?', native('js?', (x) => (x instanceof JSValue ? TRUE : NIL)));

  // === String Functions ===

  env.def(
    'str',
    native('str', (...args) => {
      return args.map((a) => {
        if (typeof a === 'string') return a;
        return printVal(a);
      }).join('');
    })
  );

  env.def(
    'string-append',
    native('string-append', (...args) => args.map((a) => assertString(a, 'string-append')).join(''))
  );

  env.def(
    'string-length',
    native('string-length', (s) => assertString(s, 'string-length').length)
  );

  env.def(
    'substring',
    native('substring', (s, start, end) => {
      const str = assertString(s, 'substring');
      const startIdx = assertNumber(start, 'substring');
      const endIdx = end !== undefined ? assertNumber(end, 'substring') : undefined;
      return str.substring(startIdx, endIdx);
    })
  );

  env.def(
    'string-split',
    native('string-split', (s, sep) => {
      const str = assertString(s, 'string-split');
      const separator = assertString(sep, 'string-split');
      return list(...str.split(separator));
    })
  );

  env.def(
    'string-join',
    native('string-join', (lst, sep) => {
      const arr = toArray(lst).map((x) => assertString(x, 'string-join'));
      const separator = sep !== undefined ? assertString(sep, 'string-join') : '';
      return arr.join(separator);
    })
  );

  env.def(
    'string-trim',
    native('string-trim', (s) => assertString(s, 'string-trim').trim())
  );

  env.def(
    'string-upcase',
    native('string-upcase', (s) => assertString(s, 'string-upcase').toUpperCase())
  );

  env.def(
    'string-downcase',
    native('string-downcase', (s) => assertString(s, 'string-downcase').toLowerCase())
  );

  env.def(
    'string->number',
    native('string->number', (s) => {
      const n = parseFloat(assertString(s, 'string->number'));
      return isNaN(n) ? NIL : n;
    })
  );

  env.def(
    'number->string',
    native('number->string', (n) => String(assertNumber(n, 'number->string')))
  );

  env.def(
    'char-at',
    native('char-at', (s, i) => {
      const str = assertString(s, 'char-at');
      const idx = assertNumber(i, 'char-at');
      return str[idx] ?? NIL;
    })
  );

  // === Symbol Functions ===

  env.def('gensym', (() => {
    let counter = 0;
    return native('gensym', (prefix) => {
      const p = prefix ? assertString(prefix, 'gensym') : 'g';
      return sym(`${p}${counter++}`);
    });
  })());

  env.def(
    'symbol->string',
    native('symbol->string', (s) => assertSymbol(s, 'symbol->string').name)
  );

  env.def(
    'string->symbol',
    native('string->symbol', (s) => sym(assertString(s, 'string->symbol')))
  );

  // === Higher-Order Functions ===

  env.def(
    'map',
    native('map', (fn, ...lists) => {
      if (lists.length === 0) return NIL;
      const f = assertFunction(fn, 'map');
      const arrays = lists.map((l) => toArray(l));
      const len = Math.min(...arrays.map((a) => a.length));
      const results: LispVal[] = [];

      for (let i = 0; i < len; i++) {
        const args = arrays.map((a) => a[i]);
        if (f instanceof NativeFn) {
          results.push(f.fn(...args));
        } else {
          const callEnv = f.env.extend();
          for (let j = 0; j < f.params.length; j++) {
            callEnv.def(f.params[j], args[j] ?? NIL);
          }
          let result: LispVal = NIL;
          for (const expr of f.body) {
            result = evaluate(expr, callEnv);
          }
          results.push(result);
        }
      }

      return list(...results);
    })
  );

  env.def(
    'filter',
    native('filter', (fn, lst) => {
      const f = assertFunction(fn, 'filter');
      const arr = toArray(lst);
      const results: LispVal[] = [];

      for (const item of arr) {
        let keep: LispVal;
        if (f instanceof NativeFn) {
          keep = f.fn(item);
        } else {
          const callEnv = f.env.extend();
          callEnv.def(f.params[0], item);
          keep = NIL;
          for (const expr of f.body) {
            keep = evaluate(expr, callEnv);
          }
        }
        if (isTruthy(keep)) {
          results.push(item);
        }
      }

      return list(...results);
    })
  );

  env.def(
    'reduce',
    native('reduce', (fn, init, lst) => {
      const f = assertFunction(fn, 'reduce');
      const arr = toArray(lst);
      let acc = init;

      for (const item of arr) {
        if (f instanceof NativeFn) {
          acc = f.fn(acc, item);
        } else {
          const callEnv = f.env.extend();
          callEnv.def(f.params[0], acc);
          callEnv.def(f.params[1], item);
          for (const expr of f.body) {
            acc = evaluate(expr, callEnv);
          }
        }
      }

      return acc;
    })
  );

  env.def(
    'fold',
    native('fold', (fn, init, lst) => {
      // Alias for reduce
      return (env.get('reduce') as NativeFn).fn(fn, init, lst);
    })
  );

  env.def(
    'some',
    native('some', (fn, lst) => {
      const f = assertFunction(fn, 'some');
      for (const item of toArray(lst)) {
        let result: LispVal;
        if (f instanceof NativeFn) {
          result = f.fn(item);
        } else {
          const callEnv = f.env.extend();
          callEnv.def(f.params[0], item);
          result = NIL;
          for (const expr of f.body) {
            result = evaluate(expr, callEnv);
          }
        }
        if (isTruthy(result)) return TRUE;
      }
      return NIL;
    })
  );

  env.def(
    'every',
    native('every', (fn, lst) => {
      const f = assertFunction(fn, 'every');
      for (const item of toArray(lst)) {
        let result: LispVal;
        if (f instanceof NativeFn) {
          result = f.fn(item);
        } else {
          const callEnv = f.env.extend();
          callEnv.def(f.params[0], item);
          result = NIL;
          for (const expr of f.body) {
            result = evaluate(expr, callEnv);
          }
        }
        if (!isTruthy(result)) return NIL;
      }
      return TRUE;
    })
  );

  env.def(
    'find',
    native('find', (fn, lst) => {
      const f = assertFunction(fn, 'find');
      for (const item of toArray(lst)) {
        let result: LispVal;
        if (f instanceof NativeFn) {
          result = f.fn(item);
        } else {
          const callEnv = f.env.extend();
          callEnv.def(f.params[0], item);
          result = NIL;
          for (const expr of f.body) {
            result = evaluate(expr, callEnv);
          }
        }
        if (isTruthy(result)) return item;
      }
      return NIL;
    })
  );

  env.def(
    'apply',
    native('apply', (fn, args) => {
      const f = assertFunction(fn, 'apply');
      const argList = toArray(args);
      if (f instanceof NativeFn) {
        return f.fn(...argList);
      }
      const callEnv = f.env.extend();
      for (let i = 0; i < f.params.length; i++) {
        callEnv.def(f.params[i], argList[i] ?? NIL);
      }
      if (f.rest) {
        callEnv.def(f.rest, list(...argList.slice(f.params.length)));
      }
      let result: LispVal = NIL;
      for (const expr of f.body) {
        result = evaluate(expr, callEnv);
      }
      return result;
    })
  );

  // === I/O ===

  env.def(
    'print',
    native('print', (...args) => {
      console.log(...args.map(printVal));
      return NIL;
    })
  );

  env.def(
    'println',
    native('println', (...args) => {
      console.log(...args.map(printVal));
      return NIL;
    })
  );

  env.def(
    'pr',
    native('pr', (...args) => {
      process.stdout.write(args.map(printVal).join(' '));
      return NIL;
    })
  );

  env.def(
    'prn',
    native('prn', (...args) => {
      console.log(args.map(printVal).join(' '));
      return NIL;
    })
  );

  // === Vector (JS Array) Operations ===

  env.def(
    'vector',
    native('vector', (...args) => new JSValue(args.map(toLispJS)))
  );

  env.def(
    'vector-ref',
    native('vector-ref', (vec, i) => {
      if (!(vec instanceof JSValue) || !Array.isArray(vec.value)) {
        throw new Error('vector-ref: expected vector');
      }
      return fromJS((vec.value as unknown[])[assertNumber(i, 'vector-ref')]);
    })
  );

  env.def(
    'vector-set!',
    native('vector-set!', (vec, i, val) => {
      if (!(vec instanceof JSValue) || !Array.isArray(vec.value)) {
        throw new Error('vector-set!: expected vector');
      }
      (vec.value as unknown[])[assertNumber(i, 'vector-set!')] = toLispJS(val);
      return val;
    })
  );

  env.def(
    'vector-length',
    native('vector-length', (vec) => {
      if (!(vec instanceof JSValue) || !Array.isArray(vec.value)) {
        throw new Error('vector-length: expected vector');
      }
      return (vec.value as unknown[]).length;
    })
  );

  env.def(
    'vector-push!',
    native('vector-push!', (vec, val) => {
      if (!(vec instanceof JSValue) || !Array.isArray(vec.value)) {
        throw new Error('vector-push!: expected vector');
      }
      (vec.value as unknown[]).push(toLispJS(val));
      return vec;
    })
  );

  env.def(
    'list->vector',
    native('list->vector', (lst) => new JSValue(toArray(lst).map(toLispJS)))
  );

  env.def(
    'vector->list',
    native('vector->list', (vec) => {
      if (!(vec instanceof JSValue) || !Array.isArray(vec.value)) {
        throw new Error('vector->list: expected vector');
      }
      return list(...(vec.value as unknown[]).map(fromJS));
    })
  );

  // === Hash Map Operations ===

  env.def(
    'hash-map',
    native('hash-map', (...args) => {
      const map = new Map<unknown, unknown>();
      for (let i = 0; i < args.length; i += 2) {
        map.set(toLispJS(args[i]), toLispJS(args[i + 1]));
      }
      return new JSValue(map);
    })
  );

  env.def(
    'hash-get',
    native('hash-get', (map, key) => {
      if (!(map instanceof JSValue) || !(map.value instanceof Map)) {
        throw new Error('hash-get: expected hash-map');
      }
      return fromJS((map.value as Map<unknown, unknown>).get(toLispJS(key)));
    })
  );

  env.def(
    'hash-set!',
    native('hash-set!', (map, key, val) => {
      if (!(map instanceof JSValue) || !(map.value instanceof Map)) {
        throw new Error('hash-set!: expected hash-map');
      }
      (map.value as Map<unknown, unknown>).set(toLispJS(key), toLispJS(val));
      return val;
    })
  );

  env.def(
    'hash-has?',
    native('hash-has?', (map, key) => {
      if (!(map instanceof JSValue) || !(map.value instanceof Map)) {
        throw new Error('hash-has?: expected hash-map');
      }
      return (map.value as Map<unknown, unknown>).has(toLispJS(key)) ? TRUE : NIL;
    })
  );

  env.def(
    'hash-keys',
    native('hash-keys', (map) => {
      if (!(map instanceof JSValue) || !(map.value instanceof Map)) {
        throw new Error('hash-keys: expected hash-map');
      }
      return list(...Array.from((map.value as Map<unknown, unknown>).keys()).map(fromJS));
    })
  );

  env.def(
    'hash-values',
    native('hash-values', (map) => {
      if (!(map instanceof JSValue) || !(map.value instanceof Map)) {
        throw new Error('hash-values: expected hash-map');
      }
      return list(...Array.from((map.value as Map<unknown, unknown>).values()).map(fromJS));
    })
  );

  // === Utility ===

  env.def('identity', native('identity', (x) => x));
  env.def('constantly', native('constantly', (x) => native('constantly-fn', () => x)));

  env.def(
    'range',
    native('range', (start, end, step) => {
      let s = 0, e = 0, st = 1;
      if (end === undefined) {
        e = assertNumber(start, 'range');
      } else {
        s = assertNumber(start, 'range');
        e = assertNumber(end, 'range');
        if (step !== undefined) {
          st = assertNumber(step, 'range');
        }
      }
      const result: number[] = [];
      if (st > 0) {
        for (let i = s; i < e; i += st) result.push(i);
      } else {
        for (let i = s; i > e; i += st) result.push(i);
      }
      return list(...result);
    })
  );

  env.def(
    'repeat',
    native('repeat', (n, x) => {
      const count = assertNumber(n, 'repeat');
      const result: LispVal[] = [];
      for (let i = 0; i < count; i++) {
        result.push(x);
      }
      return list(...result);
    })
  );

  env.def(
    'take',
    native('take', (n, lst) => {
      const count = assertNumber(n, 'take');
      return list(...toArray(lst).slice(0, count));
    })
  );

  env.def(
    'drop',
    native('drop', (n, lst) => {
      const count = assertNumber(n, 'drop');
      return list(...toArray(lst).slice(count));
    })
  );

  env.def(
    'zip',
    native('zip', (...lists) => {
      const arrays = lists.map(toArray);
      const len = Math.min(...arrays.map((a) => a.length));
      const results: LispVal[] = [];
      for (let i = 0; i < len; i++) {
        results.push(list(...arrays.map((a) => a[i])));
      }
      return list(...results);
    })
  );

  env.def(
    'flatten',
    native('flatten', (lst) => {
      const flatten = (val: LispVal): LispVal[] => {
        if (!(val instanceof Cons)) return [val];
        const result: LispVal[] = [];
        for (const item of toArray(val)) {
          result.push(...flatten(item));
        }
        return result;
      };
      return list(...flatten(lst));
    })
  );

  // Time functions
  env.def('now', native('now', () => Date.now()));
  env.def(
    'sleep',
    native('sleep', (ms) => {
      const start = Date.now();
      while (Date.now() - start < assertNumber(ms, 'sleep')) {
        // Busy wait (not ideal but works for simple cases)
      }
      return NIL;
    })
  );

  // Error handling
  env.def(
    'error',
    native('error', (msg) => {
      throw new Error(typeof msg === 'string' ? msg : printVal(msg));
    })
  );

  // Type conversion
  env.def('->js', native('->js', (val) => new JSValue(toLispJS(val))));
  env.def('<-js', native('<-js', (val) => {
    if (val instanceof JSValue) return fromJS(val.value);
    return val;
  }));

  return env;
}

// Deep equality check
function deepEqual(a: LispVal, b: LispVal): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'number' || typeof a === 'string' || typeof a === 'boolean') {
    return a === b;
  }
  if (a instanceof LispSymbol && b instanceof LispSymbol) {
    return a.name === b.name;
  }
  if (a instanceof Cons && b instanceof Cons) {
    return deepEqual(a.car, b.car) && deepEqual(a.cdr, b.cdr);
  }
  if (a instanceof JSValue && b instanceof JSValue) {
    return a.value === b.value;
  }
  return false;
}
