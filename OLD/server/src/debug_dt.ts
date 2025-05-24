import * as D from './debug';
import * as U from './util/util';

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
        D.log(`expected: ${U.precision(expected_dt, 1)}, avg: ${avg}`, diffs);
    }
}
