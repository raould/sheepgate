import * as Cdb from './client_db';
import * as Db from './db';
import * as U from './util/util';
import * as D from './debug';

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
    get_db(): any;
    stringify(): string;
}
