import { Context as SlangContext } from '..';
import { GoRoutine, Context } from './goroutine';
export declare class Scheduler {
    static MIN_TIME_QUANTA: number;
    static MAX_TIME_QUANTA: number;
    private rIdCounter;
    private slangContext;
    private routines;
    constructor(slangContext: SlangContext);
    private static randTimeQuanta;
    private schedule;
    spawn(goRoutineCtx: Context, isMain?: boolean): void;
    run(): void;
    get activeGoRoutines(): Array<GoRoutine>;
}
