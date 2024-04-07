import { Context as SlangContext } from '..'
import { GoRoutine, GoRoutineState, Context } from './goroutine'
import { RuntimeSourceError } from '../errors/runtimeSourceError'
import { Counter, benchmark } from './lib/utils'
import { DeadLockError } from './error'

type TimeQuanta = number

export class Scheduler {
  static MIN_TIME_QUANTA = 10
  static MAX_TIME_QUANTA = 20

  // counter to generate unique routine ids
  private rIdCounter = new Counter()

  private slangContext: SlangContext
  private routines: Array<[GoRoutine, TimeQuanta]> = []
  constructor(slangContext: SlangContext) {
    this.slangContext = slangContext
  }

  private static randTimeQuanta(): TimeQuanta {
    const [minTQ, maxTQ] = [Scheduler.MIN_TIME_QUANTA, Scheduler.MAX_TIME_QUANTA]
    return Math.floor(Math.random() * (maxTQ - minTQ) + minTQ)
  }

  private schedule(routine: GoRoutine): void {
    this.routines.push([routine, Scheduler.randTimeQuanta()])
  }

  public spawn(goRoutineCtx: Context, isMain: boolean = false) {
    this.schedule(new GoRoutine(this.rIdCounter.next(), goRoutineCtx, this, isMain))
  }

  @benchmark('Scheduler::run')
  public run(): void {
    // the number of consecutive time quanta where all routines made no progress
    let numConsecNoProgress = 0

    while (this.routines.length && numConsecNoProgress < this.routines.length) {
      const [routine, timeQuanta] = this.routines.shift() as [GoRoutine, TimeQuanta]

      let remainingTime = timeQuanta
      while (remainingTime--) {
        const result = routine.tick()
        if (result.isFailure) {
          this.slangContext.errors.push(result.error as RuntimeSourceError)
          break
        }
        // if the routine is no longer running we schedule it out
        if (result.unwrap() !== GoRoutineState.Running) { break } // prettier-ignore
      }

      // once main exits, the other routines are terminated and the program exits
      if (routine.isMain && routine.state === GoRoutineState.Exited) { return } // prettier-ignore

      // if the routine exits, we don't schedule it back
      if (routine.state === GoRoutineState.Exited) { continue } // prettier-ignore

      this.schedule(routine)

      const hasProgress = this.routines.some(([{ progress }]) => progress)
      numConsecNoProgress = hasProgress ? 0 : numConsecNoProgress + 1
    }

    // if we reach here, all routines are blocked
    this.slangContext.errors.push(new DeadLockError())
  }
}
