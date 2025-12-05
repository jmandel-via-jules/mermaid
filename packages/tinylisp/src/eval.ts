/**
 * 🌸 TinyLisp Evaluator
 *
 * The heart of the interpreter - evaluates Lisp expressions
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

// Evaluate an expression
export function evaluate(expr: LispVal, env: Environment): LispVal {
  // Trampoline for tail call optimization
  while (true) {
    // Self-evaluating values
    if (typeof expr === 'number') return expr;
    if (typeof expr === 'string') return expr;
    if (typeof expr === 'boolean') return expr ? TRUE : NIL;
    if (expr instanceof NativeFn) return expr;
    if (expr instanceof Lambda) return expr;
    if (expr instanceof Macro) return expr;
    if (expr instanceof JSValue) return expr;

    // Symbol lookup
    if (expr instanceof LispSymbol) {
      if (expr === NIL) return NIL;
      if (expr === TRUE) return TRUE;
      return env.get(expr);
    }

    // List evaluation (function call or special form)
    if (expr instanceof Cons) {
      const head = expr.car;
      const args = expr.cdr;

      // Special forms (check if head is a symbol)
      if (head instanceof LispSymbol) {
        const result = evalSpecialForm(head.name, args, env);
        if (result !== undefined) {
          if (result.tail) {
            // Tail call - loop instead of recursive call
            expr = result.expr;
            env = result.env;
            continue;
          }
          return result.value!;
        }
      }

      // Regular function call
      const fn = evaluate(head, env);
      const argVals = evalList(args, env);

      // Native function
      if (fn instanceof NativeFn) {
        return fn.fn(...argVals);
      }

      // Lambda - set up tail call
      if (fn instanceof Lambda) {
        const newEnv = fn.env.extend();
        bindParams(fn.params, fn.rest, argVals, newEnv);

        // Evaluate body except last expression
        for (let i = 0; i < fn.body.length - 1; i++) {
          evaluate(fn.body[i], newEnv);
        }

        // Tail call for last expression
        if (fn.body.length > 0) {
          expr = fn.body[fn.body.length - 1];
          env = newEnv;
          continue;
        }
        return NIL;
      }

      // JS function call
      if (fn instanceof JSValue && typeof fn.value === 'function') {
        const jsArgs = argVals.map(toLispJS);
        const result = (fn.value as Function)(...jsArgs);
        return fromJS(result);
      }

      throw new Error(`Cannot call ${printVal(fn)}`);
    }

    return NIL;
  }
}

// Result of special form evaluation
type SpecialFormResult =
  | { tail: true; expr: LispVal; env: Environment }
  | { tail: false; value: LispVal }
  | undefined;

function evalSpecialForm(
  name: string,
  args: LispVal,
  env: Environment
): SpecialFormResult {
  const argList = toArray(args);

  switch (name) {
    // (quote x) - return x unevaluated
    case 'quote':
      return { tail: false, value: argList[0] ?? NIL };

    // (if cond then else?)
    case 'if': {
      const [cond, then, els] = argList;
      if (isTruthy(evaluate(cond, env))) {
        return { tail: true, expr: then, env };
      }
      return { tail: true, expr: els ?? NIL, env };
    }

    // (cond (test expr...)...)
    case 'cond': {
      for (const clause of argList) {
        const clauseArr = toArray(clause);
        const test = clauseArr[0];

        // else clause
        if (test instanceof LispSymbol && test.name === 'else') {
          return evalBody(clauseArr.slice(1), env);
        }

        if (isTruthy(evaluate(test, env))) {
          if (clauseArr.length === 1) {
            return { tail: false, value: TRUE };
          }
          return evalBody(clauseArr.slice(1), env);
        }
      }
      return { tail: false, value: NIL };
    }

    // (and x...) - short-circuit AND
    case 'and': {
      if (argList.length === 0) return { tail: false, value: TRUE };
      for (let i = 0; i < argList.length - 1; i++) {
        if (!isTruthy(evaluate(argList[i], env))) {
          return { tail: false, value: NIL };
        }
      }
      return { tail: true, expr: argList[argList.length - 1], env };
    }

    // (or x...) - short-circuit OR
    case 'or': {
      if (argList.length === 0) return { tail: false, value: NIL };
      for (let i = 0; i < argList.length - 1; i++) {
        const val = evaluate(argList[i], env);
        if (isTruthy(val)) {
          return { tail: false, value: val };
        }
      }
      return { tail: true, expr: argList[argList.length - 1], env };
    }

    // (let ((var val)...) body...)
    case 'let': {
      const bindings = toArray(argList[0]);
      const body = argList.slice(1);
      const newEnv = env.extend();

      for (const binding of bindings) {
        const [varSym, valExpr] = toArray(binding);
        if (!(varSym instanceof LispSymbol)) {
          throw new Error('let binding must be a symbol');
        }
        newEnv.def(varSym, evaluate(valExpr, env)); // Use outer env!
      }

      return evalBody(body, newEnv);
    }

    // (let* ((var val)...) body...) - sequential binding
    case 'let*': {
      const bindings = toArray(argList[0]);
      const body = argList.slice(1);
      let currentEnv = env.extend();

      for (const binding of bindings) {
        const [varSym, valExpr] = toArray(binding);
        if (!(varSym instanceof LispSymbol)) {
          throw new Error('let* binding must be a symbol');
        }
        currentEnv.def(varSym, evaluate(valExpr, currentEnv));
      }

      return evalBody(body, currentEnv);
    }

    // (letrec ((var val)...) body...) - recursive binding
    case 'letrec': {
      const bindings = toArray(argList[0]);
      const body = argList.slice(1);
      const newEnv = env.extend();

      // First pass: define all variables as nil
      for (const binding of bindings) {
        const [varSym] = toArray(binding);
        if (!(varSym instanceof LispSymbol)) {
          throw new Error('letrec binding must be a symbol');
        }
        newEnv.def(varSym, NIL);
      }

      // Second pass: evaluate and assign
      for (const binding of bindings) {
        const [varSym, valExpr] = toArray(binding);
        newEnv.set(varSym as LispSymbol, evaluate(valExpr, newEnv));
      }

      return evalBody(body, newEnv);
    }

    // (lambda (params...) body...)
    case 'lambda':
    case 'fn': {
      const { params, rest } = parseParams(argList[0]);
      const body = argList.slice(1);
      return { tail: false, value: new Lambda(params, body, env, rest) };
    }

    // (define name value) or (define (name params...) body...)
    case 'define':
    case 'def': {
      const first = argList[0];

      if (first instanceof LispSymbol) {
        // (define name value)
        const value = evaluate(argList[1], env);
        env.def(first, value);
        return { tail: false, value };
      }

      if (first instanceof Cons) {
        // (define (name params...) body...) - sugar for defun
        const name = first.car;
        if (!(name instanceof LispSymbol)) {
          throw new Error('define: function name must be a symbol');
        }
        const { params, rest } = parseParams(first.cdr);
        const body = argList.slice(1);
        const fn = new Lambda(params, body, env, rest);
        env.def(name, fn);
        return { tail: false, value: fn };
      }

      throw new Error('define: invalid syntax');
    }

    // (defun name (params...) body...)
    case 'defun': {
      const name = argList[0];
      if (!(name instanceof LispSymbol)) {
        throw new Error('defun: name must be a symbol');
      }
      const { params, rest } = parseParams(argList[1]);
      const body = argList.slice(2);
      const fn = new Lambda(params, body, env, rest);
      env.def(name, fn);
      return { tail: false, value: fn };
    }

    // (defmacro name (params...) body...)
    case 'defmacro': {
      const name = argList[0];
      if (!(name instanceof LispSymbol)) {
        throw new Error('defmacro: name must be a symbol');
      }
      const { params, rest } = parseParams(argList[1]);
      const body = argList.slice(2);
      const macro = new Macro(params, body, env, rest);
      env.def(name, macro);
      return { tail: false, value: macro };
    }

    // (set! var value)
    case 'set!': {
      const varSym = argList[0];
      if (!(varSym instanceof LispSymbol)) {
        throw new Error('set!: first argument must be a symbol');
      }
      const value = evaluate(argList[1], env);
      env.set(varSym, value);
      return { tail: false, value };
    }

    // (begin expr...) or (progn expr...)
    case 'begin':
    case 'progn':
    case 'do':
      return evalBody(argList, env);

    // (quasiquote x) - template with unquote
    case 'quasiquote':
      return { tail: false, value: expandQuasiquote(argList[0], env) };

    // These shouldn't be evaluated directly
    case 'unquote':
    case 'unquote-splicing':
      throw new Error(`${name} outside of quasiquote`);

    // (while cond body...)
    case 'while': {
      const [cond, ...body] = argList;
      let result: LispVal = NIL;
      while (isTruthy(evaluate(cond, env))) {
        for (const expr of body) {
          result = evaluate(expr, env);
        }
      }
      return { tail: false, value: result };
    }

    // (for (var init cond step) body...)
    case 'for': {
      const spec = toArray(argList[0]);
      const [varSym, init, cond, step] = spec;
      const body = argList.slice(1);

      if (!(varSym instanceof LispSymbol)) {
        throw new Error('for: variable must be a symbol');
      }

      const loopEnv = env.extend();
      loopEnv.def(varSym, evaluate(init, env));

      let result: LispVal = NIL;
      while (isTruthy(evaluate(cond, loopEnv))) {
        for (const expr of body) {
          result = evaluate(expr, loopEnv);
        }
        loopEnv.set(varSym, evaluate(step, loopEnv));
      }
      return { tail: false, value: result };
    }

    // (try expr (catch (var) handler...))
    case 'try': {
      const [tryExpr, catchClause] = argList;
      try {
        return { tail: false, value: evaluate(tryExpr, env) };
      } catch (e) {
        if (catchClause instanceof Cons) {
          const catchArgs = toArray(catchClause);
          if (
            catchArgs[0] instanceof LispSymbol &&
            catchArgs[0].name === 'catch'
          ) {
            const errorVar = toArray(catchArgs[1])[0];
            const handlers = catchArgs.slice(2);
            const catchEnv = env.extend();
            if (errorVar instanceof LispSymbol) {
              catchEnv.def(
                errorVar,
                e instanceof Error ? e.message : String(e)
              );
            }
            return evalBody(handlers, catchEnv);
          }
        }
        throw e;
      }
    }

    // (throw msg)
    case 'throw':
      throw new Error(String(evaluate(argList[0], env)));

    // JS interop special forms
    // (js/get obj key) - get property
    case 'js/get': {
      const obj = toLispJS(evaluate(argList[0], env));
      const key = toLispJS(evaluate(argList[1], env)) as string | number;
      return { tail: false, value: fromJS((obj as Record<string | number, unknown>)[key]) };
    }

    // (js/set! obj key val) - set property
    case 'js/set!': {
      const obj = toLispJS(evaluate(argList[0], env));
      const key = toLispJS(evaluate(argList[1], env)) as string | number;
      const val = toLispJS(evaluate(argList[2], env));
      (obj as Record<string | number, unknown>)[key] = val;
      return { tail: false, value: fromJS(val) };
    }

    // (js/call obj method args...) - call method
    case 'js/call': {
      const obj = toLispJS(evaluate(argList[0], env));
      const method = toLispJS(evaluate(argList[1], env)) as string;
      const callArgs = argList.slice(2).map((a) => toLispJS(evaluate(a, env)));
      const result = (obj as Record<string, (...args: unknown[]) => unknown>)[method](...callArgs);
      return { tail: false, value: fromJS(result) };
    }

    // (js/new constructor args...) - create new instance
    case 'js/new': {
      const ctor = toLispJS(evaluate(argList[0], env));
      const ctorArgs = argList.slice(1).map((a) => toLispJS(evaluate(a, env)));
      return { tail: false, value: new JSValue(new (ctor as new (...args: unknown[]) => unknown)(...ctorArgs)) };
    }

    // (js/await promise) - await a promise (returns JSValue)
    case 'js/await': {
      const promise = toLispJS(evaluate(argList[0], env));
      // Can't actually await synchronously, return the promise wrapped
      return { tail: false, value: new JSValue(promise) };
    }

    // (. obj method args...) - method call shorthand
    case '.': {
      const obj = toLispJS(evaluate(argList[0], env));
      const method = argList[1];
      if (!(method instanceof LispSymbol)) {
        throw new Error('.: method must be a symbol');
      }
      const callArgs = argList.slice(2).map((a) => toLispJS(evaluate(a, env)));
      const result = (obj as Record<string, (...args: unknown[]) => unknown>)[method.name](...callArgs);
      return { tail: false, value: fromJS(result) };
    }

    // (.- obj prop) - property access shorthand
    case '.-': {
      const obj = toLispJS(evaluate(argList[0], env));
      const prop = argList[1];
      if (!(prop instanceof LispSymbol)) {
        throw new Error('.-: property must be a symbol');
      }
      return { tail: false, value: fromJS((obj as Record<string, unknown>)[prop.name]) };
    }

    default:
      // Check if it's a macro call
      if (env.has(name)) {
        const val = env.get(name);
        if (val instanceof Macro) {
          // Expand and evaluate macro
          const expanded = expandMacro(val, args);
          return { tail: true, expr: expanded, env };
        }
      }
      return undefined; // Not a special form
  }
}

// Evaluate a body of expressions, returning tail call for last
function evalBody(
  body: LispVal[],
  env: Environment
): SpecialFormResult {
  if (body.length === 0) {
    return { tail: false, value: NIL };
  }

  for (let i = 0; i < body.length - 1; i++) {
    evaluate(body[i], env);
  }

  return { tail: true, expr: body[body.length - 1], env };
}

// Evaluate a list and return array of results
function evalList(list: LispVal, env: Environment): LispVal[] {
  const results: LispVal[] = [];
  let current = list;
  while (current instanceof Cons) {
    results.push(evaluate(current.car, env));
    current = current.cdr;
  }
  return results;
}

// Parse parameter list, handling &rest
function parseParams(paramList: LispVal): {
  params: LispSymbol[];
  rest?: LispSymbol;
} {
  const params: LispSymbol[] = [];
  let rest: LispSymbol | undefined;
  const arr = toArray(paramList);

  for (let i = 0; i < arr.length; i++) {
    const p = arr[i];
    if (p instanceof LispSymbol) {
      if (p.name === '&rest' || p.name === '&') {
        // Next param is rest
        const restParam = arr[i + 1];
        if (restParam instanceof LispSymbol) {
          rest = restParam;
        }
        break;
      }
      params.push(p);
    }
  }

  return { params, rest };
}

// Bind parameters to arguments
function bindParams(
  params: LispSymbol[],
  rest: LispSymbol | undefined,
  args: LispVal[],
  env: Environment
): void {
  for (let i = 0; i < params.length; i++) {
    env.def(params[i], args[i] ?? NIL);
  }

  if (rest) {
    env.def(rest, list(...args.slice(params.length)));
  }
}

// Expand macro call
function expandMacro(macro: Macro, args: LispVal): LispVal {
  const newEnv = macro.env.extend();
  const argArr = toArray(args);
  bindParams(macro.params, macro.rest, argArr, newEnv);

  let result: LispVal = NIL;
  for (const expr of macro.body) {
    result = evaluate(expr, newEnv);
  }
  return result;
}

// Expand quasiquote template
function expandQuasiquote(expr: LispVal, env: Environment): LispVal {
  if (!(expr instanceof Cons)) {
    return expr;
  }

  // Check for unquote
  if (
    expr.car instanceof LispSymbol &&
    expr.car.name === 'unquote'
  ) {
    const arg = toArray(expr.cdr)[0];
    return evaluate(arg, env);
  }

  // Process list, handling unquote-splicing
  const results: LispVal[] = [];
  let current: LispVal = expr;

  while (current instanceof Cons) {
    const item = current.car;

    if (
      item instanceof Cons &&
      item.car instanceof LispSymbol &&
      item.car.name === 'unquote-splicing'
    ) {
      // Splice in the evaluated list
      const spliced = evaluate(toArray(item.cdr)[0], env);
      const splicedArr = toArray(spliced);
      results.push(...splicedArr);
    } else {
      results.push(expandQuasiquote(item, env));
    }

    current = current.cdr;
  }

  return list(...results);
}

// Convert Lisp value to JS
export function toLispJS(val: LispVal): unknown {
  if (val === NIL) return null;
  if (val === TRUE) return true;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val;
  if (val instanceof JSValue) return val.value;
  if (val instanceof LispSymbol) return val.name;
  if (val instanceof Cons) return toArray(val).map(toLispJS);
  if (val instanceof Lambda || val instanceof NativeFn) {
    // Return a JS function that calls the Lisp function
    return (...args: unknown[]) => {
      const lispArgs = args.map(fromJS);
      if (val instanceof NativeFn) {
        return toLispJS(val.fn(...lispArgs));
      }
      const callEnv = val.env.extend();
      bindParams(val.params, val.rest, lispArgs, callEnv);
      let result: LispVal = NIL;
      for (const expr of val.body) {
        result = evaluate(expr, callEnv);
      }
      return toLispJS(result);
    };
  }
  return val;
}

// Convert JS value to Lisp
export function fromJS(val: unknown): LispVal {
  if (val === null || val === undefined) return NIL;
  if (val === true) return TRUE;
  if (val === false) return NIL;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return list(...val.map(fromJS));
  return new JSValue(val);
}
