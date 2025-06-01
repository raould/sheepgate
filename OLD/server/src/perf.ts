/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
export type OnPerfFn = (avg: number) => void;

export class PerfDuration {
    start_msec: number;
    stats: number[];

    constructor(private readonly count: number, private readonly on_stats: OnPerfFn) {
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
	if (this.stats.length >= this.count) {
	    const count = Math.max(this.stats.length, 1);
	    const total = this.stats.reduce((a,d) => a+d, 0);
	    this.on_stats(total/count);
	    this.stats = [];
	}
    }
}
