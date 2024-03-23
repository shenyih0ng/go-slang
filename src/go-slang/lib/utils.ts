export function zip<T1, T2>(first: Array<T1>, second: Array<T2>): Array<[T1, T2]> {
  const length = Math.min(first.length, second.length)
  const zipped: Array<[T1, T2]> = []

  for (let index = 0; index < length; index++) {
    zipped.push([first[index], second[index]])
  }

  return zipped
}

export function isAny<T1, T2>(query: T1, values: T2[]): boolean {
  return query ? values.some(v => v === query) : false
}
