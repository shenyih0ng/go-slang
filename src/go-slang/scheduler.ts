import { Context as SlangContext } from '..'
import { GoRoutine, GoRoutineState } from './goroutine'
import { RuntimeSourceError } from '../errors/runtimeSourceError'

type TimeQuanta = number

export class Scheduler {
  static MIN_TIME_QUANTA = 10
  static MAX_TIME_QUANTA = 20

  private slangContext: SlangContext
  private routines: Array<[GoRoutine, TimeQuanta]> = []

  constructor(slangContext: SlangContext) {
    this.slangContext = slangContext
  }

  private static randTimeQuanta(): TimeQuanta {
    const [minTQ, maxTQ] = [Scheduler.MIN_TIME_QUANTA, Scheduler.MAX_TIME_QUANTA]
    return Math.floor(Math.random() * (maxTQ - minTQ) + minTQ)
  }

  public schedule(routine: GoRoutine): void {
    this.routines.push([routine, Scheduler.randTimeQuanta()])
  }

  public run(): void {
    while (this.routines.length) {
      const [routine, timeQuanta] = this.routines.shift() as [GoRoutine, TimeQuanta]

      let remainingTime = timeQuanta
      while (remainingTime--) {
        const result = routine.tick()
        if (result.isFailure) { this.slangContext.errors.push(result.error as RuntimeSourceError) } // prettier-ignore
        // if the routine is no longer running we schedule it out
        if (result.unwrap() !== GoRoutineState.Running) { break } // prettier-ignore
      }

      // once main exits, the other routines are terminated and the program exits
      if (routine.isMain && routine.state === GoRoutineState.Exited) { return } // prettier-ignore

      // if the routine exits, we don't schedule it back
      if (routine.state === GoRoutineState.Exited) { continue } // prettier-ignore

      this.schedule(routine)
    }
  }
}
