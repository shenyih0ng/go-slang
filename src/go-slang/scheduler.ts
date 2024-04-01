import { Context as SlangContext } from '..'
import { GoRoutine } from './goroutine'
import { RuntimeSourceError } from '../errors/runtimeSourceError'

type TimeQuanta = number

export class Scheduler {
  static TIME_QUANTA = 15

  private slangContext: SlangContext
  private routines: Array<[GoRoutine, TimeQuanta]> = []

  constructor(slangContext: SlangContext) {
    this.slangContext = slangContext
  }

  public schedule(routine: GoRoutine): void {
    this.routines.push([routine, Scheduler.TIME_QUANTA])
  }

  public run(): void {
    while (this.routines.length > 0) {
      const [routine, timeQuanta] = this.routines.shift() as [GoRoutine, TimeQuanta]

      let hasError: boolean = false
      let remainingTime = timeQuanta

      while (remainingTime--) {
        if (routine.finished()) { break } // prettier-ignore

        const result = routine.tick()
        if (result.isSuccess) { continue } // prettier-ignore

        hasError = true
        this.slangContext.errors.push(result.error as RuntimeSourceError)
        break
      }

      // once main exits, the other routines are terminated and the program exits
      if (routine.isMain && (routine.finished() || hasError)) { return } // prettier-ignore

      if (!routine.finished() && !hasError) {
        this.routines.push([routine, Scheduler.TIME_QUANTA])
      }
    }
  }
}
