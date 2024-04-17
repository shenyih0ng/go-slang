import { RuntimeSourceError } from '../../errors/runtimeSourceError'
import { InvalidOperationError } from '../error'
import { BinaryOperator, UnaryOperator } from '../types'
import { HeapObject } from './heap/types'
import { Result } from './utils'

function _typeof(value: any): string {
  if (value instanceof HeapObject) {
    return 'heapObj'
  }

  const typeName = typeof value
  return typeName === 'number' ? 'int' : typeName
}

function isSameType(left: any, right: any): boolean {
  return _typeof(left) === _typeof(right)
}

function evaluateArthmeticOp(
  operator: BinaryOperator,
  left: any,
  right: any
): Result<any, InvalidOperationError> {
  if (!isSameType(left, right)) {
    return Result.fail(
      new InvalidOperationError(
        `${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`
      )
    )
  }

  const allowedTypes = operator === '%' ? ['int'] : ['int', 'string']
  if (!allowedTypes.includes(_typeof(left))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`)
    )
  }
  if (!allowedTypes.includes(_typeof(right))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`)
    )
  }

  let result = undefined

  switch (operator) {
    case '+':
      result = left + right
      break
    case '-':
      result = left - right
      break
    case '*':
      result = left * right
      break
    case '/':
      // NOTE: this calculates the quotient
      result = Math.floor(left / right)
      break
    case '%':
      result = left % right
      break
  }

  return Result.ok(result)
}

function evaluateBitwiseOp(
  operator: BinaryOperator,
  left: any,
  right: any
): Result<any, InvalidOperationError> {
  if (!isSameType(left, right)) {
    return Result.fail(
      new InvalidOperationError(
        `${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`
      )
    )
  }

  const allowedTypes = ['int']
  if (!allowedTypes.includes(_typeof(left))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`)
    )
  }
  if (!allowedTypes.includes(_typeof(right))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`)
    )
  }

  if ((operator === '<<' || operator === '>>') && right < 0) {
    return Result.fail(new InvalidOperationError(`negative shift count ${right}`))
  }

  let result = undefined

  switch (operator) {
    case '|':
      result = left | right
      break
    case '&':
      result = left & right
      break
    case '^':
      result = left ^ right
      break
    case '&^':
      result = left & ~right
      break
    case '<<':
      result = left << right
      break
    case '>>':
      result = left >> right
      break
  }

  return Result.ok(result)
}

function evaluateRelationalOp(
  operator: BinaryOperator,
  left: any,
  right: any
): Result<boolean, InvalidOperationError> {
  const hasNil = left === undefined || right === undefined

  if (!isSameType(left, right) && !hasNil) {
    return Result.fail(
      new InvalidOperationError(
        `${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`
      )
    )
  }

  if (_typeof(left) === 'heapObj' && !hasNil) {
    if (operator !== '==' && operator !== '!=') {
      return Result.fail(
        new InvalidOperationError(
          `${left} ${operator} ${right} (operator ${operator} not defined on chan)`
        )
      )
    }
    // compare the memory address of the two heap objects
    left = left.addr
    right = right.addr
  }

  let result = undefined

  switch (operator) {
    case '==':
      result = left == right
      break
    case '!=':
      result = left != right
      break
    case '<':
      result = left < right
      break
    case '<=':
      result = left <= right
      break
    case '>':
      result = left > right
      break
    case '>=':
      result = left >= right
      break
  }

  return Result.ok(result)
}

function evaluateLogicalOp(operator: BinaryOperator, left: any, right: any): any {
  if (!isSameType(left, right)) {
    return Result.fail(
      new InvalidOperationError(
        `${left} ${operator} ${right} (mismatched types ${_typeof(left)} and ${_typeof(right)})`
      )
    )
  }

  const allowedTypes = ['boolean']
  if (!allowedTypes.includes(_typeof(left))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${left} (${_typeof(left)})`)
    )
  }
  if (!allowedTypes.includes(_typeof(right))) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${right} (${_typeof(right)})`)
    )
  }

  let result = undefined

  switch (operator) {
    case '&&':
      result = left && right
      break
    case '||':
      result = left || right
      break
  }

  return Result.ok(result)
}

export function evaluateUnaryOp(
  operator: Omit<UnaryOperator, '<-'>,
  value: any
): Result<any, RuntimeSourceError> {
  const valueType = _typeof(value)
  if (
    ((operator === '+' || operator === '-' || operator === '^') && valueType !== 'int') ||
    (operator === '!' && valueType !== 'boolean')
  ) {
    return Result.fail(
      new InvalidOperationError(`operator ${operator} not defined on ${value} (${valueType})`)
    )
  }

  let result = undefined

  switch (operator) {
    case '+':
      result = +value
      break
    case '-':
      result = -value
      break
    case '!':
      result = !value
      break
    case '^':
      result = value ^ -1
      break
  }

  return Result.ok(result)
}

export function evaluateBinaryOp(
  operator: BinaryOperator,
  left: any,
  right: any
): Result<any, RuntimeSourceError> {
  switch (operator) {
    case '+':
    case '-':
    case '*':
    case '/':
    case '%':
      return evaluateArthmeticOp(operator, left, right)
    case '|':
    case '&':
    case '^':
    case '&^':
    case '<<':
    case '>>':
      return evaluateBitwiseOp(operator, left, right)
    case '==':
    case '!=':
    case '<':
    case '<=':
    case '>':
    case '>=':
      return evaluateRelationalOp(operator, left, right)
    case '&&':
    case '||':
      return evaluateLogicalOp(operator, left, right)
  }
}
