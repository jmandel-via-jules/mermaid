/**
 * 🌸 TinyLisp Tests
 */

import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { TinyLisp, createLisp, NIL, TRUE, printVal } from './index.js';

describe('TinyLisp', () => {
  test('arithmetic operations', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS('(+ 1 2 3)'), 6);
    assert.equal(lisp.evalToJS('(- 10 3)'), 7);
    assert.equal(lisp.evalToJS('(* 2 3 4)'), 24);
    assert.equal(lisp.evalToJS('(/ 20 4)'), 5);
    assert.equal(lisp.evalToJS('(mod 17 5)'), 2);
  });

  test('comparison operations', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS('(< 1 2)'), true);
    assert.equal(lisp.evalToJS('(> 1 2)'), null);
    assert.equal(lisp.evalToJS('(= 5 5)'), true);
    assert.equal(lisp.evalToJS('(<= 3 3)'), true);
  });

  test('list operations', () => {
    const lisp = new TinyLisp();
    assert.deepEqual(lisp.evalToJS("(list 1 2 3)"), [1, 2, 3]);
    assert.equal(lisp.evalToJS("(car '(1 2 3))"), 1);
    assert.deepEqual(lisp.evalToJS("(cdr '(1 2 3))"), [2, 3]);
    assert.deepEqual(lisp.evalToJS("(cons 0 '(1 2))"), [0, 1, 2]);
    assert.equal(lisp.evalToJS("(length '(a b c d))"), 4);
    assert.deepEqual(lisp.evalToJS("(reverse '(1 2 3))"), [3, 2, 1]);
  });

  test('define and lambda', () => {
    const lisp = new TinyLisp();
    lisp.run('(define x 42)');
    assert.equal(lisp.evalToJS('x'), 42);

    lisp.run('(define add1 (lambda (n) (+ n 1)))');
    assert.equal(lisp.evalToJS('(add1 5)'), 6);

    lisp.run('(defun square (x) (* x x))');
    assert.equal(lisp.evalToJS('(square 7)'), 49);
  });

  test('if and cond', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS('(if t 1 2)'), 1);
    assert.equal(lisp.evalToJS('(if nil 1 2)'), 2);
    assert.equal(lisp.evalToJS('(cond (nil 1) (t 2))'), 2);
  });

  test('let bindings', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS('(let ((x 10) (y 20)) (+ x y))'), 30);
    assert.equal(lisp.evalToJS('(let* ((x 5) (y (* x 2))) y)'), 10);
  });

  test('higher-order functions', () => {
    const lisp = new TinyLisp();
    assert.deepEqual(
      lisp.evalToJS("(map (fn (x) (* x 2)) '(1 2 3))"),
      [2, 4, 6]
    );
    assert.deepEqual(
      lisp.evalToJS("(filter (fn (x) (> x 2)) '(1 2 3 4 5))"),
      [3, 4, 5]
    );
    assert.equal(
      lisp.evalToJS("(reduce + 0 '(1 2 3 4))"),
      10
    );
  });

  test('closures', () => {
    const lisp = new TinyLisp();
    lisp.run(`
      (defun make-counter ()
        (let ((count 0))
          (fn ()
            (set! count (+ count 1))
            count)))
    `);
    lisp.run('(define counter (make-counter))');
    assert.equal(lisp.evalToJS('(counter)'), 1);
    assert.equal(lisp.evalToJS('(counter)'), 2);
    assert.equal(lisp.evalToJS('(counter)'), 3);
  });

  test('recursion with tail calls', () => {
    const lisp = new TinyLisp();
    lisp.run(`
      (defun factorial (n)
        (if (<= n 1)
            1
            (* n (factorial (- n 1)))))
    `);
    assert.equal(lisp.evalToJS('(factorial 5)'), 120);

    // Tail recursive version
    lisp.run(`
      (defun factorial-tr (n acc)
        (if (<= n 1)
            acc
            (factorial-tr (- n 1) (* n acc))))
    `);
    assert.equal(lisp.evalToJS('(factorial-tr 5 1)'), 120);
  });

  test('quasiquote', () => {
    const lisp = new TinyLisp();
    lisp.run('(define x 5)');
    assert.deepEqual(lisp.evalToJS('`(1 2 ,x)'), [1, 2, 5]);
    lisp.run("(define lst '(a b c))");
    assert.deepEqual(lisp.evalToJS('`(1 ,@lst 2)'), [1, 'a', 'b', 'c', 2]);
  });

  test('macros', () => {
    const lisp = new TinyLisp();
    lisp.run(`
      (defmacro unless (test &rest body)
        \`(if ,test nil (begin ,@body)))
    `);
    assert.equal(lisp.evalToJS('(unless nil 42)'), 42);
    assert.equal(lisp.evalToJS('(unless t 42)'), null);
  });

  test('string operations', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS('(str "hello" " " "world")'), 'hello world');
    assert.equal(lisp.evalToJS('(string-length "hello")'), 5);
    assert.equal(lisp.evalToJS('(string-upcase "hello")'), 'HELLO');
    assert.deepEqual(lisp.evalToJS('(string-split "a,b,c" ",")'), ['a', 'b', 'c']);
  });

  test('TypeScript interop - expose function', () => {
    const lisp = new TinyLisp();
    lisp.expose('double', (x: number) => x * 2);
    assert.equal(lisp.evalToJS('(double 21)'), 42);
  });

  test('TypeScript interop - call lisp function', () => {
    const lisp = new TinyLisp();
    lisp.run('(defun greet (name) (str "Hello, " name "!"))');
    assert.equal(lisp.call('greet', 'World'), 'Hello, World!');
  });

  test('TypeScript interop - JS property access', () => {
    const lisp = new TinyLisp();
    lisp.define('obj', { name: 'Alice', age: 30 });
    assert.equal(lisp.evalToJS('(js/get obj "name")'), 'Alice');
    assert.equal(lisp.evalToJS('(.- obj name)'), 'Alice');
  });

  test('TypeScript interop - JS method call', () => {
    const lisp = new TinyLisp();
    lisp.define('myarr', [3, 1, 4, 1, 5]);
    // sort returns the sorted array
    assert.deepEqual(lisp.evalToJS('(js/call myarr "sort")'), [1, 1, 3, 4, 5]);
    // Test join on the original array (demonstrating method calling works)
    assert.equal(lisp.evalToJS('(js/call myarr "join" "-")'), '3-1-4-1-5');
  });

  test('vectors (JS arrays)', () => {
    const lisp = new TinyLisp();
    lisp.run('(define v (vector 1 2 3))');
    assert.equal(lisp.evalToJS('(vector-ref v 1)'), 2);
    lisp.run('(vector-set! v 1 42)');
    assert.equal(lisp.evalToJS('(vector-ref v 1)'), 42);
    assert.equal(lisp.evalToJS('(vector-length v)'), 3);
  });

  test('hash maps', () => {
    const lisp = new TinyLisp();
    lisp.run('(define m (hash-map "a" 1 "b" 2))');
    assert.equal(lisp.evalToJS('(hash-get m "a")'), 1);
    lisp.run('(hash-set! m "c" 3)');
    assert.equal(lisp.evalToJS('(hash-get m "c")'), 3);
    assert.equal(lisp.evalToJS('(hash-has? m "b")'), true);
  });

  test('error handling', () => {
    const lisp = new TinyLisp();
    assert.equal(
      lisp.evalToJS(`
        (try
          (throw "oops")
          (catch (e)
            (str "caught: " e)))
      `),
      'caught: oops'
    );
  });

  test('standard library - threading macros', () => {
    const lisp = createLisp();
    assert.equal(
      lisp.evalToJS('(-> 5 inc inc (* 2))'),
      14
    );
    assert.deepEqual(
      lisp.evalToJS("(->> '(1 2 3) (map inc) (filter even?))"),
      [2, 4]
    );
  });

  test('standard library - predicates', () => {
    const lisp = createLisp();
    assert.equal(lisp.evalToJS('(even? 4)'), true);
    assert.equal(lisp.evalToJS('(odd? 4)'), null);
    assert.equal(lisp.evalToJS('(zero? 0)'), true);
    assert.equal(lisp.evalToJS('(positive? 5)'), true);
    assert.equal(lisp.evalToJS('(negative? -3)'), true);
  });

  test('standard library - when/unless macros', () => {
    const lisp = createLisp();
    assert.equal(lisp.evalToJS('(when t 1 2 3)'), 3);
    assert.equal(lisp.evalToJS('(when nil 1 2 3)'), null);
    assert.equal(lisp.evalToJS('(unless nil 42)'), 42);
  });

  test('range and utility functions', () => {
    const lisp = new TinyLisp();
    assert.deepEqual(lisp.evalToJS('(range 5)'), [0, 1, 2, 3, 4]);
    assert.deepEqual(lisp.evalToJS('(range 2 5)'), [2, 3, 4]);
    assert.deepEqual(lisp.evalToJS('(take 3 (range 10))'), [0, 1, 2]);
    assert.deepEqual(lisp.evalToJS('(drop 3 (range 5))'), [3, 4]);
  });

  test('rest parameters', () => {
    const lisp = new TinyLisp();
    lisp.run('(defun sum-all (&rest nums) (reduce + 0 nums))');
    assert.equal(lisp.evalToJS('(sum-all 1 2 3 4 5)'), 15);
  });

  test('apply function', () => {
    const lisp = new TinyLisp();
    assert.equal(lisp.evalToJS("(apply + '(1 2 3 4))"), 10);
  });

  test('complex example - fibonacci', () => {
    const lisp = createLisp();
    lisp.run(`
      (defun fib (n)
        (cond
          ((= n 0) 0)
          ((= n 1) 1)
          (else (+ (fib (- n 1)) (fib (- n 2))))))
    `);
    assert.deepEqual(
      lisp.evalToJS('(map fib (range 10))'),
      [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    );
  });

  test('complex example - quicksort', () => {
    const lisp = createLisp();
    lisp.run(`
      (defun quicksort (lst)
        (if (null? lst)
            nil
            (let ((pivot (car lst))
                  (rest (cdr lst)))
              (append
                (quicksort (filter (fn (x) (< x pivot)) rest))
                (list pivot)
                (quicksort (filter (fn (x) (>= x pivot)) rest))))))
    `);
    assert.deepEqual(
      lisp.evalToJS("(quicksort '(3 1 4 1 5 9 2 6 5 3 5))"),
      [1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]
    );
  });
});

console.log('🌸 All tests passed!');
