# 🌸 TinyLisp

A cute, powerful Lisp interpreter for TypeScript with seamless interop.

## Features

- **Full Lisp** - Macros, closures, tail call optimization
- **TypeScript Native** - Clean API for embedding
- **JS Interop** - Call JS from Lisp and vice versa
- **Batteries Included** - Rich standard library

## Quick Start

```typescript
import { TinyLisp, createLisp } from 'tinylisp';

// Create a Lisp instance with stdlib
const lisp = createLisp();

// Evaluate expressions
lisp.eval('(+ 1 2 3)'); // => 6

// Define functions
lisp.run(`
  (defun factorial (n)
    (if (<= n 1)
        1
        (* n (factorial (- n 1)))))
`);

// Call Lisp from TypeScript
lisp.call('factorial', 5); // => 120

// Expose TypeScript to Lisp
lisp.expose('fetch-json', async (url) => {
  const res = await fetch(url);
  return res.json();
});
```

## Language Guide

### Basics

```lisp
; Numbers
42
3.14
-17

; Strings
"hello, world"

; Symbols
foo
my-variable
*special*

; Lists
(1 2 3)
(a b c)

; Quoted lists (don't evaluate)
'(1 2 3)
```

### Defining Things

```lisp
; Variables
(define x 42)
(def name "Alice")

; Functions
(defun greet (name)
  (str "Hello, " name "!"))

; Short form
(define (square x) (* x x))

; Lambda
(define add1 (fn (x) (+ x 1)))
(define add1 (lambda (x) (+ x 1)))

; Rest parameters
(defun sum-all (&rest nums)
  (reduce + 0 nums))
```

### Control Flow

```lisp
; If
(if (> x 0)
    "positive"
    "non-positive")

; Cond
(cond
  ((< x 0) "negative")
  ((= x 0) "zero")
  (else "positive"))

; When/Unless (with stdlib)
(when (> x 0)
  (print "positive!")
  x)

; And/Or (short-circuit)
(and a b c)
(or a b c)
```

### Lists

```lisp
; Construction
(list 1 2 3)
(cons 0 '(1 2 3))      ; => (0 1 2 3)

; Access
(car '(a b c))          ; => a
(cdr '(a b c))          ; => (b c)
(first '(a b c))        ; => a (alias)
(rest '(a b c))         ; => (b c) (alias)
(nth '(a b c d) 2)      ; => c

; Predicates
(null? '())             ; => t
(list? '(1 2))          ; => t
(length '(a b c))       ; => 3

; Operations
(append '(1 2) '(3 4))  ; => (1 2 3 4)
(reverse '(1 2 3))      ; => (3 2 1)
(take 2 '(a b c d))     ; => (a b)
(drop 2 '(a b c d))     ; => (c d)
```

### Higher-Order Functions

```lisp
; Map
(map inc '(1 2 3))          ; => (2 3 4)
(map + '(1 2) '(10 20))     ; => (11 22)

; Filter
(filter even? '(1 2 3 4 5)) ; => (2 4)

; Reduce/Fold
(reduce + 0 '(1 2 3 4))     ; => 10

; Others
(some even? '(1 3 4 5))     ; => t
(every even? '(2 4 6))      ; => t
(find even? '(1 3 4 5))     ; => 4
```

### Let Bindings

```lisp
; Parallel binding
(let ((x 10)
      (y 20))
  (+ x y))

; Sequential binding
(let* ((x 5)
       (y (* x 2)))
  y)  ; => 10

; Recursive binding
(letrec ((even? (fn (n) (if (= n 0) t (odd? (- n 1)))))
         (odd? (fn (n) (if (= n 0) nil (even? (- n 1))))))
  (even? 10))
```

### Macros

```lisp
; Define a macro
(defmacro unless (test &rest body)
  `(if ,test nil (begin ,@body)))

; Use it
(unless (= x 0)
  (print "not zero")
  x)

; Threading macros (stdlib)
(-> 5 inc inc (* 2))        ; => 14
(->> '(1 2 3)
     (map inc)
     (filter even?))        ; => (2 4)
```

### Error Handling

```lisp
; Try/catch
(try
  (/ 1 0)
  (catch (e)
    (str "Error: " e)))

; Throw
(throw "something went wrong")
```

## TypeScript Integration

### Exposing Functions

```typescript
// Simple function
lisp.expose('greet', (name: string) => `Hello, ${name}!`);

// In Lisp
lisp.eval('(greet "World")'); // => "Hello, World!"

// Async function (returns promise wrapper)
lisp.exposeAsync('fetch-data', async (url) => {
  const res = await fetch(url);
  return res.json();
});
```

### Calling Lisp Functions

```typescript
lisp.run('(defun add (a b) (+ a b))');
lisp.call('add', 2, 3); // => 5

// Get/set variables
lisp.define('counter', 0);
lisp.get('counter'); // => 0
```

### JS Interop from Lisp

```lisp
; Property access
(.- obj property)
(js/get obj "property")

; Property set
(js/set! obj "property" value)

; Method call
(. obj method arg1 arg2)
(js/call obj "method" arg1 arg2)

; Constructor
(js/new Constructor arg1 arg2)

; Convert values
(->js lisp-value)   ; Lisp -> JS
(<-js js-value)     ; JS -> Lisp
```

### Vectors (JS Arrays)

```lisp
; Create
(vector 1 2 3)
[1 2 3]  ; Sugar syntax

; Access
(vector-ref v 0)
(vector-length v)

; Mutate
(vector-set! v 0 "new")
(vector-push! v "item")

; Convert
(list->vector '(1 2 3))
(vector->list v)
```

### Hash Maps

```lisp
; Create
(hash-map "a" 1 "b" 2)

; Access
(hash-get m "a")
(hash-has? m "key")

; Mutate
(hash-set! m "c" 3)

; Iterate
(hash-keys m)
(hash-values m)
```

## Standard Library

Load with `createLisp()` or `lisp.loadStdLib()`:

### Composition

```lisp
(compose f g)           ; (f (g x))
(pipe f g h)            ; (h (g (f x)))
(partial f arg1)        ; Partially apply
(flip f)                ; Swap argument order
(curry f)               ; Curry binary function
```

### Predicates

```lisp
(even? n)
(odd? n)
(zero? n)
(positive? n)
(negative? n)
```

### Control Flow Macros

```lisp
(when test body...)
(unless test body...)
(if-let (var expr) then else)
(when-let (var expr) body...)
```

### Loops

```lisp
(while condition body...)

(for (i 0 (< i 10) (inc i))
  (print i))

(dotimes (i 5)
  (print i))

(dolist (x '(a b c))
  (print x))
```

### Utilities

```lisp
(range 10)              ; (0 1 2 ... 9)
(range 5 10)            ; (5 6 7 8 9)
(repeat 3 "x")          ; ("x" "x" "x")
(zip '(1 2) '(a b))     ; ((1 a) (2 b))
(flatten '((1 2) (3)))  ; (1 2 3)
(partition 2 '(1 2 3 4)); ((1 2) (3 4))
(interpose ", " '(a b)) ; (a ", " b)
```

## Examples

### Fibonacci

```lisp
(defun fib (n)
  (cond
    ((= n 0) 0)
    ((= n 1) 1)
    (else (+ (fib (- n 1))
             (fib (- n 2))))))

(map fib (range 10))
; => (0 1 1 2 3 5 8 13 21 34)
```

### Quicksort

```lisp
(defun quicksort (lst)
  (if (null? lst)
      nil
      (let ((pivot (car lst))
            (rest (cdr lst)))
        (append
          (quicksort (filter (fn (x) (< x pivot)) rest))
          (list pivot)
          (quicksort (filter (fn (x) (>= x pivot)) rest))))))

(quicksort '(3 1 4 1 5 9 2 6))
; => (1 1 2 3 4 5 6 9)
```

### Closures

```lisp
(defun make-counter ()
  (let ((count 0))
    (fn ()
      (set! count (inc count))
      count)))

(define counter (make-counter))
(counter) ; => 1
(counter) ; => 2
(counter) ; => 3
```

### Memoization

```lisp
(define fib-memo
  (memoize
    (fn (n)
      (if (<= n 1)
          n
          (+ (fib-memo (- n 1))
             (fib-memo (- n 2)))))))

(fib-memo 40) ; Fast!
```

## REPL

```bash
npx tinylisp

🌸 TinyLisp v0.1.0
🌸 > (+ 1 2 3)
  => 6
🌸 > (defun sq (x) (* x x))
  => #<lambda>
🌸 > (map sq '(1 2 3 4 5))
  => (1 4 9 16 25)
```

## License

MIT
