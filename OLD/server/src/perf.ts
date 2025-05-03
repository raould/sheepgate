export type OnStatsFn = (fps: number) => void;

export class Perf {
    start_msec: number;
    stats: number[];

    constructor(private readonly interval: number, private readonly on_stats: OnStatsFn) {
	this.start_msec = 0;
	this.stats = [];
    }

    begin() {
	this.start_msec = Date.now();
    }

    end() {
	const now = Date.now();
	const dt = now - this.start_msec;
	this.stats.push(dt);
	if (this.stats.length >= this.interval) {
	    const count = Math.max(this.stats.length, 1);
	    const total = this.stats.reduce((a,d) => a+d, 0);
	    this.on_stats(total/count);
	    this.stats = [];
	}
    }
}
