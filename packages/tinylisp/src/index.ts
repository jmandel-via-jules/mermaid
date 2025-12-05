/**
 * 🌸 TinyLisp
 *
 * A cute, powerful Lisp interpreter for TypeScript
 *
 * Features:
 * - Full Lisp with macros, closures, and tail call optimization
 * - Seamless TypeScript/JavaScript interop
 * - Clean integration API for embedding
 *
 * @example
 * ```typescript
 * import { TinyLisp } from './tinylisp';
 *
 * const lisp = new TinyLisp();
 *
 * // Define functions in Lisp
 * lisp.run(`
 *   (defun factorial (n)
 *     (if (<= n 1)
 *         1
 *         (* n (factorial (- n 1)))))
 * `);
 *
 * // Call from TypeScript
 * const result = lisp.call('factorial', 5); // 120
 *
 * // Expose TypeScript functions to Lisp
 * lisp.expose('fetch-data', async (url) => {
 *   const res = await fetch(url);
 *   return res.json();
 * });
 * ```
 */

import { read, readAll, isComplete } from './reader.js';
import { evaluate, toLispJS, fromJS } from './eval.js';
import { createEnv } from './builtins.js';
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
  printVal,
  isTruthy,
} from './types.js';

export type { LispVal };
export {
  // Types (classes)
  LispSymbol,
  Cons,
  Lambda,
  Macro,
  NativeFn,
  JSValue,
  Environment,
  NIL,
  TRUE,

  // Functions
  sym,
  cons,
  list,
  toArray,
  printVal,
  isTruthy,
  read,
  readAll,
  isComplete,
  evaluate,
  toLispJS,
  fromJS,
  createEnv,
};

/**
 * Main TinyLisp interpreter class
 * Provides a clean interface for embedding Lisp in TypeScript
 */
export class TinyLisp {
  public env: Environment;

  constructor(env?: Environment) {
    this.env = env ?? createEnv();
  }

  /**
   * Evaluate a Lisp expression string
   */
  eval(code: string): LispVal {
    const exprs = readAll(code);
    let result: LispVal = NIL;
    for (const expr of exprs) {
      result = evaluate(expr, this.env);
    }
    return result;
  }

  /**
   * Run Lisp code (alias for eval)
   */
  run(code: string): LispVal {
    return this.eval(code);
  }

  /**
   * Evaluate and return as JavaScript value
   */
  evalToJS(code: string): unknown {
    return toLispJS(this.eval(code));
  }

  /**
   * Define a variable in the environment
   */
  define(name: string, value: unknown): this {
    this.env.def(name, fromJS(value));
    return this;
  }

  /**
   * Get a variable from the environment as JS
   */
  get(name: string): unknown {
    return toLispJS(this.env.get(name));
  }

  /**
   * Check if a variable is defined
   */
  has(name: string): boolean {
    return this.env.has(name);
  }

  /**
   * Expose a TypeScript function to Lisp
   */
  expose(name: string, fn: (...args: unknown[]) => unknown): this {
    this.env.def(
      name,
      new NativeFn(name, (...lispArgs) => {
        const jsArgs = lispArgs.map(toLispJS);
        return fromJS(fn(...jsArgs));
      })
    );
    return this;
  }

  /**
   * Expose an async TypeScript function to Lisp (returns a Promise wrapper)
   */
  exposeAsync(
    name: string,
    fn: (...args: unknown[]) => Promise<unknown>
  ): this {
    this.env.def(
      name,
      new NativeFn(name, (...lispArgs) => {
        const jsArgs = lispArgs.map(toLispJS);
        const promise = fn(...jsArgs);
        return new JSValue(promise);
      })
    );
    return this;
  }

  /**
   * Call a Lisp function by name with JavaScript arguments
   */
  call(name: string, ...args: unknown[]): unknown {
    const fn = this.env.get(name);
    if (!(fn instanceof Lambda) && !(fn instanceof NativeFn)) {
      throw new Error(`${name} is not a function`);
    }

    const lispArgs = args.map(fromJS);

    if (fn instanceof NativeFn) {
      return toLispJS(fn.fn(...lispArgs));
    }

    const callEnv = fn.env.extend();
    for (let i = 0; i < fn.params.length; i++) {
      callEnv.def(fn.params[i], lispArgs[i] ?? NIL);
    }
    if (fn.rest) {
      callEnv.def(fn.rest, list(...lispArgs.slice(fn.params.length)));
    }

    let result: LispVal = NIL;
    for (const expr of fn.body) {
      result = evaluate(expr, callEnv);
    }
    return toLispJS(result);
  }

  /**
   * Load standard library extensions
   */
  loadStdLib(): this {
    this.eval(STDLIB);
    return this;
  }

  /**
   * Create a new Lisp with extended environment
   */
  extend(): TinyLisp {
    return new TinyLisp(this.env.extend());
  }

  /**
   * Pretty print a Lisp value
   */
  print(val: LispVal): string {
    return printVal(val);
  }
}

/**
 * Create a new TinyLisp instance with standard library loaded
 */
export function createLisp(): TinyLisp {
  return new TinyLisp().loadStdLib();
}

/**
 * Quick evaluation helper
 */
export function lispEval(code: string): unknown {
  return createLisp().evalToJS(code);
}

// Standard library in Lisp
const STDLIB = `
;; 🌸 TinyLisp Standard Library

;; Composition
(defun compose (f g)
  (fn (x) (f (g x))))

(defun pipe (&rest fns)
  (fn (x)
    (reduce (fn (acc f) (f acc)) x fns)))

(defun partial (f &rest args)
  (fn (&rest more)
    (apply f (append args more))))

(defun flip (f)
  (fn (a b) (f b a)))

(defun curry (f)
  (fn (a) (fn (b) (f a b))))

;; List utilities
(defun second (lst) (nth lst 1))
(defun third (lst) (nth lst 2))
(defun fourth (lst) (nth lst 3))

(defun butlast (lst)
  (if (or (null? lst) (null? (cdr lst)))
      nil
      (cons (car lst) (butlast (cdr lst)))))

(defun partition (n lst)
  (if (null? lst)
      nil
      (cons (take n lst) (partition n (drop n lst)))))

(defun interleave (a b)
  (if (or (null? a) (null? b))
      nil
      (cons (car a) (cons (car b) (interleave (cdr a) (cdr b))))))

(defun interpose (sep lst)
  (if (or (null? lst) (null? (cdr lst)))
      lst
      (cons (car lst) (cons sep (interpose sep (cdr lst))))))

;; Predicates
(defun even? (n) (= 0 (mod n 2)))
(defun odd? (n) (= 1 (mod n 2)))
(defun zero? (n) (= n 0))
(defun positive? (n) (> n 0))
(defun negative? (n) (< n 0))

;; Threading macros (like Clojure)
(defmacro -> (x &rest forms)
  (if (null? forms)
      x
      (let ((form (car forms))
            (rest (cdr forms)))
        (if (list? form)
            \`(-> (,(car form) ,x ,@(cdr form)) ,@rest)
            \`(-> (,form ,x) ,@rest)))))

(defmacro ->> (x &rest forms)
  (if (null? forms)
      x
      (let ((form (car forms))
            (rest (cdr forms)))
        (if (list? form)
            \`(->> (,@form ,x) ,@rest)
            \`(->> (,form ,x) ,@rest)))))

;; When/Unless
(defmacro when (test &rest body)
  \`(if ,test (begin ,@body) nil))

(defmacro unless (test &rest body)
  \`(if ,test nil (begin ,@body)))

;; Let variants
(defmacro if-let (binding then else)
  (let ((var (car binding))
        (val (car (cdr binding))))
    \`(let ((,var ,val))
       (if ,var ,then ,else))))

(defmacro when-let (binding &rest body)
  (let ((var (car binding))
        (val (car (cdr binding))))
    \`(let ((,var ,val))
       (when ,var ,@body))))

;; Loop constructs
(defmacro dotimes (spec &rest body)
  (let ((var (car spec))
        (count (car (cdr spec))))
    \`(for (,var 0 (< ,var ,count) (inc ,var))
       ,@body)))

(defmacro dolist (spec &rest body)
  (let ((var (car spec))
        (lst (car (cdr spec)))
        (lst-sym (gensym "lst")))
    \`(let ((,lst-sym ,lst))
       (while (not (null? ,lst-sym))
         (let ((,var (car ,lst-sym)))
           ,@body
           (set! ,lst-sym (cdr ,lst-sym)))))))

;; Assertions
(defun assert (cond msg)
  (if cond
      t
      (error (str "Assertion failed: " msg))))

;; Memoization
(defun memoize (f)
  (let ((cache (hash-map)))
    (fn (&rest args)
      (let ((key (->js args)))
        (if (hash-has? cache key)
            (hash-get cache key)
            (let ((result (apply f args)))
              (hash-set! cache key result)
              result))))))
`;
