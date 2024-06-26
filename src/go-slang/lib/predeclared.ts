import { InvalidOperationError } from '../error'
import {
  BuiltinOp,
  CommandType,
  Make,
  MakeChannel,
  New,
  NewType,
  NewWaitGroup,
  MakeType,
  isTypeLiteral
} from '../types'

export type PredeclaredFuncT = (...args: any) => any

export interface PredeclaredFunc {
  name: string
  func: PredeclaredFuncT
  op: Omit<BuiltinOp, 'id'>
}

export const PREDECLARED_IDENTIFIERS: { [key: string]: any } = {
  true: true,
  false: false,
  nil: undefined,
  'sync.WaitGroup': NewType.WaitGroup,
  'sync.Mutex': NewType.Mutex
}

/**
 * println is a predeclared function in Go that prints values to stdout.
 *
 * println wraps around the rawDisplay function that contains the console capture.
 * Since there is no way to directly output to frontend, we have to make sure of slang's native
 * rawDisplay function to capture the output and display it in the frontend.
 *
 * @param slangRawDisplay rawDisplay function that contains the console capture
 * @returns a function that takes any number of arguments and prints them to the console
 */
function println(slangRawDisplay: (str: string) => string): (...args: any) => undefined {
  return (...args: any) =>
    void slangRawDisplay(
      args.map((arg: any) => (arg != undefined ? arg.toString() : '(no value)')).join(' ')
    )
}

function make(...args: any): Make | InvalidOperationError {
  if (args.length === 0) {
    return new InvalidOperationError(`not enough arguments for make() (expected 1, found 0)`)
  }

  const type = args[0]
  if (!isTypeLiteral(type)) {
    return new InvalidOperationError(`make: first argument must be a type; ${type} is not a type`)
  }

  if (type.value === MakeType.Channel) {
    if (args.length > 2) {
      return new InvalidOperationError(
        `make(${MakeType.Channel}, ${args.slice(1).join(', ')}) expects 1 or 2 arguments; found ${args.length}`
      )
    }
    if (args.length === 2) {
      if (typeof args[1] !== 'number') {
        return new InvalidOperationError(
          `make(${MakeType.Channel}, ${args[1]})}) expects second argument to be a number; found ${args[1]}`
        )
      }
      if (args[1] < 0) {
        return new InvalidOperationError(
          `make(${MakeType.Channel}, ${args[1]})}) expects second argument to be a non-negative number; found ${args[1]}`
        )
      }
    }

    return { type: MakeType.Channel, size: args.length === 2 ? args[1] : 0 } as MakeChannel
  }

  // NOTE: this should be unreachable
  return new InvalidOperationError(`make: cannot make type ${type.value}`)
}

function _new(...args: any): New | InvalidOperationError {
  if (args.length === 0) {
    return new InvalidOperationError(`not enough arguments for new() (expected 1, found 0)`)
  }

  const type = args[0]
  if (!isTypeLiteral(type)) {
    return new InvalidOperationError(`new: first argument must be a type; ${type} is not a type`)
  }

  if (type.value === NewType.WaitGroup) {
    if (args.length > 1) {
      return new InvalidOperationError(
        `new(${NewType.WaitGroup}, ${args.slice(1).join(', ')}) expects 1 argument; found ${args.length}`
      )
    }
    return { type: NewType.WaitGroup, count: 0 } as NewWaitGroup
  }

  if (type.value === NewType.Mutex) {
    if (args.length > 1) {
      return new InvalidOperationError(
        `new(${NewType.Mutex}, ${args.slice(1).join(', ')}) expects 1 arguments; found ${args.length}`
      )
    }
    return { type: NewType.Mutex } as New
  }

  // NOTE: this should be unreachable
  return new InvalidOperationError(`new: cannot make type ${type.value}`)
}

export const PREDECLARED_FUNCTIONS: PredeclaredFunc[] = [
  {
    name: 'println',
    func: println as unknown as PredeclaredFuncT, // trust me
    op: { type: CommandType.BuiltinOp, arity: undefined }
  },
  {
    name: 'make',
    func: make,
    op: { type: CommandType.BuiltinOp, arity: 2 }
  },
  {
    name: 'new',
    func: _new,
    op: { type: CommandType.BuiltinOp, arity: 1 }
  }
]
