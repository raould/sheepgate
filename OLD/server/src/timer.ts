/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as U from './util/util';
import * as D from './debug';

export type Callback = () => void;

let next_id: number = 0;

// only the most recent instance of this will be allowed to
// run, any older ones will stop looping. although it doesn't
// in and of itself guarantee the old instances are garbage collected.
export class OnlyOneCallbackTimer {
    id: number;
    last_msec: number;

    constructor(private readonly loop: Callback, private readonly timeout: number) {
        this.id = ++next_id;
	this.last_msec = 0;
        D.log("new OnlyOneCallbackTimer", this.id, this.last_msec, this.timeout);
    }

    start() {
        this.run();
    }

    private run() {
	setImmediate(
            () => {
                if (this.id == next_id) {
		    const now = Date.now();
		    const dt = now - this.last_msec;
		    if (dt >= this.timeout) {
			this.loop();
			this.last_msec = now;
		    }
		    this.run();
                }
                else {
                    D.log("exiting OnlyOneCallbackTimer", this.id);
                }
            }
        );
    }
}
