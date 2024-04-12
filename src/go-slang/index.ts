import { Context, Result } from '..'
import { resolvedErrorPromise } from '../runner'
import { evaluate } from './ece'
import { SourceFile } from './types'

export async function goRunner(program: any, heapSize: number, context: Context): Promise<Result> {
  const value = evaluate(program as SourceFile, heapSize, context)
  if (context.errors.length > 0) {
    return resolvedErrorPromise
  }
  return { status: 'finished', context, value }
}
