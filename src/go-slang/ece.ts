import { Context as SlangContext } from '..'
import { Stack } from '../cse-machine/utils'
import { Value } from '../types'
import { Context } from './goroutine'
import { AstMap } from './lib/astMap'
import { Environment } from './lib/env'
import { Heap, HeapAddress } from './lib/heap'
import { PREDECLARED_FUNCTIONS, PREDECLARED_IDENTIFIERS } from './lib/predeclared'
import { Scheduler } from './scheduler'
import { BuiltinOp, CallExpression, Instruction, NodeType, SourceFile } from './types'

function initMainGoRoutineCtx(program: SourceFile, slangContext: SlangContext): Context {
  const C = new Stack<Instruction | HeapAddress>()
  const S = new Stack<any>()
  const E = new Environment({ ...PREDECLARED_IDENTIFIERS })

  // `SourceFile` is the root node of the AST which has latest (monotonically increasing) uid of all AST nodes
  // Therefore, the next uid to be used to track AST nodes is the uid of SourceFile + 1
  const A = new AstMap((program.uid as number) + 1)
  const H = new Heap(A)

  // inject predeclared functions into the global environment
  const B = new Map<number, (...args: any[]) => any>()
  PREDECLARED_FUNCTIONS.forEach(({ name, func, op }, id) => {
    E.declare(name, { ...op, id } as BuiltinOp)
    if (name === 'println') {
      // println is special case where we need to the `rawDisplay` slang builtin for
      // console capture, therefore we handle it differently from other predeclared functions
      // NOTE: we assume that the `rawDisplay` builtin always exists
      B.set(id, func(slangContext.nativeStorage.builtins.get('slangRawDisplay')))
      return
    }
    B.set(id, func)
  })

  // seed the `main` go routine with the program's `main` function
  const CALL_MAIN: CallExpression = {
    type: NodeType.CallExpression,
    callee: { type: NodeType.Identifier, name: 'main' },
    args: []
  }
  C.pushR(H.alloc(program), H.alloc(CALL_MAIN))

  return { C, S, E, B, H, A } as Context
}

export function evaluate(program: SourceFile, slangContext: SlangContext): Value {
  const scheduler = new Scheduler(slangContext)
  const mainRoutineCtx = initMainGoRoutineCtx(program, slangContext)

  scheduler.spawn(mainRoutineCtx, true)
  scheduler.run()

  return 'Program exited'
}
