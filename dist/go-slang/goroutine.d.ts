import { Stack } from '../cse-machine/utils';
import { RuntimeSourceError } from '../errors/runtimeSourceError';
import { AstMap } from './lib/astMap';
import { Environment } from './lib/env';
import { Heap, HeapAddress } from './lib/heap';
import { Result } from './lib/utils';
import { Instruction } from './types';
import { Scheduler } from './scheduler';
import { PredeclaredFuncT } from './lib/predeclared';
export type Control = Stack<Instruction | HeapAddress>;
export type Stash = Stack<HeapAddress | any>;
export type Builtins = Map<number, PredeclaredFuncT>;
export interface Context {
    C: Control;
    S: Stash;
    E: Environment;
    B: Builtins;
    H: Heap;
    A: AstMap;
}
export declare enum GoRoutineState {
    Running = 0,
    Blocked = 1,
    Exited = 2
}
export declare class GoRoutine {
    private id;
    private context;
    private scheduler;
    progress: boolean;
    private prevInst;
    state: GoRoutineState;
    isMain: boolean;
    constructor(id: number, context: Context, scheduler: Scheduler, isMain?: boolean);
    activeHeapAddresses(): Set<HeapAddress>;
    tick(): Result<GoRoutineState, RuntimeSourceError>;
}
