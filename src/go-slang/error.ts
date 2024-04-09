import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { NodeLocation } from './types'

export class UnknownInstructionError extends RuntimeSourceError {
  private inst_type: string

  constructor(inst_type: string) {
    super()
    this.inst_type = inst_type
  }

  public explain() {
    return `Unknown instruction ${this.inst_type}.`
  }

  public elaborate() {
    return `The instruction ${this.inst_type} is not supported by the interpreter. This is likely a bug in the interpreter. Please report this issue.`
  }
}

export class InvalidOperationError extends RuntimeSourceError {
  private errorMessage: string

  public location: NodeLocation

  constructor(errorMessage: string) {
    super()
    this.errorMessage = errorMessage
  }

  public explain(): string {
    return `invalid operation: ${this.errorMessage}`
  }
}

export class UndefinedError extends RuntimeSourceError {
  private identifier: string

  public location: NodeLocation

  constructor(identifier: string, location: NodeLocation) {
    super()
    this.identifier = identifier
    this.location = location
  }

  public explain() {
    return `undefined: ${this.identifier}`
  }
}

export class FuncArityError extends RuntimeSourceError {
  private func_name: string
  private n_actual: number
  private n_expected: number

  public location: NodeLocation

  constructor(func_name: string, n_actual: number, n_expected: number, location: NodeLocation) {
    super()
    this.func_name = func_name
    this.n_actual = n_actual
    this.n_expected = n_expected
    this.location = location
  }

  public explain() {
    return (
      `${this.n_actual - this.n_expected < 0 ? 'not enough' : 'too many'} arguments in call to ${this.func_name}` +
      `\n  have ${this.n_actual}` +
      `\n  want ${this.n_expected}`
    )
  }
}

export class GoExprMustBeFunctionCallError extends RuntimeSourceError {
  private expr: string

  public location: NodeLocation

  constructor(expr: string, location: NodeLocation) {
    super()
    this.expr = expr
    this.location = location
  }

  public explain() {
    return `expression in go must be function call, not ${this.expr}`
  }
}

export class DeadLockError extends RuntimeSourceError {
  public explain() {
    return 'all goroutines are asleep - deadlock!'
  }
}

export class OutOfMemoryError extends RuntimeSourceError {
  public explain() {
    return 'runtime: out of memory'
  }
}
