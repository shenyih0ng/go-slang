import { BuiltinOp, CommandType } from '../types'

export interface PredeclaredFunc {
  name: string
  func: (...args: any) => any
  op: Omit<BuiltinOp, 'id'>
}

export const PREDECLARED_IDENTIFIERS: { [key: string]: any } = {
  true: true,
  false: false
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

export const PREDECLARED_FUNCTIONS: PredeclaredFunc[] = [
  {
    name: 'println',
    func: println,
    op: {
      type: CommandType.BuiltinOp,
      arity: undefined
    }
  }
]
