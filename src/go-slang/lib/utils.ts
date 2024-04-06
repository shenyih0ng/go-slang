import { SourceError } from '../../types'

export function zip<T1, T2>(first: Array<T1>, second: Array<T2>): Array<[T1, T2]> {
  const length = Math.min(first.length, second.length)
  const zipped: Array<[T1, T2]> = []

  for (let index = 0; index < length; index++) {
    zipped.push([first[index], second[index]])
  }

  return zipped
}

/**
 * Check if a given (query) value is in a list of values.
 *
 * @param query
 * @param values
 * @returns true if the query value is in the list of values, false otherwise.
 */
export function isAny<T1, T2>(query: T1, values: T2[]): boolean {
  return query ? values.some(v => v === query) : false
}

export class Result<T, E extends SourceError> {
  private value: T | undefined

  public isSuccess: boolean
  public isFailure: boolean
  public error: E | undefined

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this.error = error
    this.value = value

    Object.freeze(this)
  }

  public unwrap(): T {
    if (this.isFailure) {
      throw new Error('called `unwrap` on a failed result')
    }
    return this.value as T
  }

  public static ok<T, E extends SourceError>(value?: T): Result<T, E> {
    return new Result<T, E>(true, undefined, value)
  }

  public static fail<T, E extends SourceError>(error: E): Result<T, E> {
    return new Result<T, E>(false, error)
  }
}

// prettier-ignore
export class Counter {
  private count = 0

  constructor (start: number = 0) { this.count = start }
  public next(): number { return this.count++ }
}
