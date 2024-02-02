import * as Cdb from './client_db';

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
    // 'step' here assumes that the correct 'dt' fps time has
    // passed, it doesn't try to check the real/world time.
    step(): void;
    stringify(): string;
}
