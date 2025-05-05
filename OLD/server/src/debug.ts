import * as U from './util/util';

export function time_str(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false });
}
export function now_str(): string {
    return time_str(new Date());
}
export function log_stamp(...args: any) {
    console.log(now_str(), ...args);
}
export function error_stamp(...args: any) {
    console.error(now_str(), ...args);
}

let debug_this_step = false;
export function debug_step_enable() {
    debug_this_step = true;
}
export function debug_step_cancel() {
    debug_this_step = false;
}
export function log_step(...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    if (debug_this_step) {
        log_stamp(...args);
    }
}

export function error(...args: any) {
    error_stamp(...args);
}

export function log(...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    log_stamp(...args);
}

export function log_if(test: boolean, ...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    if (test) {
        log_stamp(...args);
    }
}

function msgs2strs(...msgs: any): string {
    if (msgs.length == 0) {
        return "";
    }
    else {
        return msgs.flatMap((m: any) => m instanceof Function ? m() : m)
    }
}

export function assert_fail(...msgs: any) {
    log_stamp(
        "ASSERTION FAILED:",
        ...msgs2strs(msgs),
        "\n",
        new Error().stack
    );
}

export function assert(test: boolean, ...msgs: any) {
    if (!test) {
        assert_fail(msgs);
    }
}

export function assert_fn(a: any, b: any, compare: (a:any, b:any)=>boolean, ...msgs: any) {
    const eq = compare(a, b);
    if (!eq) {
        assert_fail(...msgs, a, b);
    }
}

export function assert_eqeq(a: any, b: any, ...msgs: any) {
    if (a !== b) {
        assert_fail(...msgs, a, b);
    }
}

export class DebugDT {
    timestamps: number[];

    constructor() {
        this.timestamps = [];
    }

    tick() {
        this.timestamps.push(Date.now());
        if (this.timestamps.length > 60 * 10) {
            this.timestamps = this.timestamps.slice(60 * 5);
        }
    }

    report(expected_dt: number) {
        let diffs = [];
        let total = 0;
        for (let i = 1; i < this.timestamps.length; ++i) {
            const dt = this.timestamps[i] - this.timestamps[i-1];
            total += dt;
            const diff = U.precision(dt - expected_dt, 1);
            diffs.push(diff);
        }
        const avg = U.precision(diffs.length < 1 ? 0 : total / diffs.length, 1);
        log(`expected: ${U.precision(expected_dt, 1)}, avg: ${avg}`, diffs);
    }
}
