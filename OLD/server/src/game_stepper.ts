import * as Cdb from './client_db';
import * as U from './util/util';

export function step_dt(last_msec: number, frame_msec: number, step_fn: () => void): number {
    const now = Date.now();
    const dt = now - last_msec;
    if (dt >= frame_msec) {
	console.log(U.F2D(dt), U.F2D(frame_msec));
	step_fn();
	return now;
    } else {
	return last_msec;
    }
}

// a union of the useful states
// any Stepper could be in.
export enum StepperState {
    running,
    completed,
    lost,
    // todo: paused, ...?
}

export interface Stepper {
    get_state(): StepperState;
    merge_client_db(cnew: Cdb.ClientDB): void;
    step(): void;
    stringify(): string;
}
