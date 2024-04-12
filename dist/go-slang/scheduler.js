"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const goroutine_1 = require("./goroutine");
const utils_1 = require("./lib/utils");
const error_1 = require("./error");
class Scheduler {
    constructor(slangContext) {
        // counter to generate unique routine ids
        this.rIdCounter = new utils_1.Counter();
        this.routines = [];
        this.slangContext = slangContext;
    }
    static randTimeQuanta() {
        const [minTQ, maxTQ] = [Scheduler.MIN_TIME_QUANTA, Scheduler.MAX_TIME_QUANTA];
        return Math.floor(Math.random() * (maxTQ - minTQ) + minTQ);
    }
    schedule(routine) {
        this.routines.push([routine, Scheduler.randTimeQuanta()]);
    }
    spawn(goRoutineCtx, isMain = false) {
        this.schedule(new goroutine_1.GoRoutine(this.rIdCounter.next(), goRoutineCtx, this, isMain));
    }
    run() {
        // the number of consecutive time quanta where all routines made no progress
        let numConsecNoProgress = 0;
        while (this.routines.length && numConsecNoProgress < this.routines.length) {
            const [routine, timeQuanta] = this.routines[0];
            let remainingTime = timeQuanta;
            while (remainingTime--) {
                const result = routine.tick();
                if (result.isFailure) {
                    this.slangContext.errors.push(result.error);
                    // if the routine runs out of memory, we terminate the program
                    if (result.error instanceof error_1.OutOfMemoryError) {
                        return;
                    } // prettier-ignore
                    break;
                }
                // if the routine is no longer running we schedule it out
                if (result.unwrap() !== goroutine_1.GoRoutineState.Running) {
                    break;
                } // prettier-ignore
            }
            this.routines.shift(); // remove the routine from the queue
            // once main exits, the other routines are terminated and the program exits
            if (routine.isMain && routine.state === goroutine_1.GoRoutineState.Exited) {
                return;
            } // prettier-ignore
            // if the routine exits, we don't schedule it back
            if (routine.state === goroutine_1.GoRoutineState.Exited) {
                continue;
            } // prettier-ignore
            this.schedule(routine);
            const hasProgress = this.routines.some(([{ progress }]) => progress);
            numConsecNoProgress = hasProgress ? 0 : numConsecNoProgress + 1;
        }
        // if we reach here, all routines are blocked
        this.slangContext.errors.push(new error_1.DeadLockError());
    }
    get activeGoRoutines() {
        return this.routines.map(([routine]) => routine);
    }
}
Scheduler.MIN_TIME_QUANTA = 10;
Scheduler.MAX_TIME_QUANTA = 20;
__decorate([
    (0, utils_1.benchmark)('Scheduler::run')
], Scheduler.prototype, "run", null);
exports.Scheduler = Scheduler;
//# sourceMappingURL=scheduler.js.map