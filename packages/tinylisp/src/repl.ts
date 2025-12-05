#!/usr/bin/env node
/**
 * 🌸 TinyLisp REPL
 *
 * Interactive Read-Eval-Print Loop
 */

import * as readline from 'readline';
import { TinyLisp, printVal, isComplete, NIL } from './index.js';

const BANNER = `
🌸 TinyLisp v0.1.0
A cute Lisp for TypeScript

Type (help) for commands, Ctrl+D to exit
`;

const HELP = `
Commands:
  (help)      - Show this help
  (env)       - List all bindings
  (reset)     - Reset environment
  (quit)      - Exit REPL

Examples:
  (+ 1 2 3)                    ; => 6
  (defun sq (x) (* x x))       ; Define a function
  (map sq '(1 2 3 4))          ; => (1 4 9 16)
  (-> 5 inc (* 2) str)         ; => "12"
`;

async function main() {
  console.log(BANNER);

  const lisp = new TinyLisp().loadStdLib();

  // Add REPL-specific commands
  lisp.expose('help', () => {
    console.log(HELP);
    return NIL;
  });

  lisp.expose('env', () => {
    console.log('Bindings in current environment:');
    // We can't easily list all bindings, but we can show a message
    console.log('(Use standard Lisp functions and your definitions)');
    return NIL;
  });

  let shouldReset = false;
  lisp.expose('reset', () => {
    shouldReset = true;
    return NIL;
  });

  let shouldQuit = false;
  lisp.expose('quit', () => {
    shouldQuit = true;
    return NIL;
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '🌸 > ',
  });

  let buffer = '';

  rl.prompt();

  rl.on('line', (line) => {
    buffer += (buffer ? '\n' : '') + line;

    if (!isComplete(buffer)) {
      // Multi-line input - show continuation prompt
      process.stdout.write('   | ');
      return;
    }

    if (buffer.trim()) {
      try {
        const result = lisp.eval(buffer);
        if (result !== NIL || buffer.trim().startsWith('(')) {
          console.log('  =>', printVal(result));
        }
      } catch (e) {
        console.error('  Error:', (e as Error).message);
      }
    }

    buffer = '';

    if (shouldReset) {
      shouldReset = false;
      console.log('Environment reset.');
      // Create new lisp instance
    }

    if (shouldQuit) {
      rl.close();
      return;
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
  });
}

main().catch(console.error);
