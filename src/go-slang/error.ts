import { RuntimeSourceError } from '../errors/runtimeSourceError'

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

export class UndefinedError extends RuntimeSourceError {
  private identifier: string

  constructor(identifier: string) {
    super()
    this.identifier = identifier
  }

  public explain() {
    return `undefined: ${this.identifier}`
  }
}

export class FuncArityError extends RuntimeSourceError {
  private func_name: string
  private n_actual: number
  private n_expected: number

  constructor(func_name: string, n_actual: number, n_expected: number) {
    super()
    this.func_name = func_name
    this.n_actual = n_actual
    this.n_expected = n_expected
  }

  public explain() {
    return (
      `${this.n_actual - this.n_expected < 0 ? 'not enough' : 'too many'} arguments in call to ${this.func_name}` +
      `\n  have ${this.n_actual}` +
      `\n  want ${this.n_expected}`
    )
  }
}

export class GoExprMustBeFunctionError extends RuntimeSourceError {
  private expr: string

  constructor(expr: string) {
    super()
    this.expr = expr
  }

  public explain() {
    return `expression in go statement must be function call, not ${this.expr}`
  }
}
