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

export class Result<E extends SourceError> {
  public isSuccess: boolean
  public isFailure: boolean
  public error: E | undefined

  private constructor(isSuccess: boolean, error?: E) {
    this.isSuccess = isSuccess
    this.isFailure = !isSuccess
    this.error = error
    Object.freeze(this)
  }

  public static ok<E extends SourceError>(): Result<E> {
    return new Result(true)
  }

  public static fail<E extends SourceError>(error: E): Result<E> {
    return new Result(false, error)
  }
}
