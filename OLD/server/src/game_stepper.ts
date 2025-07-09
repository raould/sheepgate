/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Cdb from './client_db';

// a union of the useful states
// any Stepper could be in.
export enum StepperState {
    running,
    completed,
    lost,
    // paused is kinda done by the state machine
    // that is around all the states.
}

export interface Stepper {
    get_state(): StepperState;
    merge_client_db(cnew: Cdb.ClientDB): void;
    step(): void;
    get_db(): any;
    stringify(): string;
}
