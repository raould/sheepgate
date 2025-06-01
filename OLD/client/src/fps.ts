/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
export type OnStatsFn = (fps: number) => void;

export class FPS {
    last_msec = 0;
    tick_count = 0;

    constructor(private readonly on_stats: OnStatsFn) {
    }

    on_tick() {
	this.tick_count++;
	const now = Date.now();
	const dt = now - this.last_msec;
	if (dt > 1000) {
	    const fps = this.tick_count * 1000 / dt;
	    this.on_stats(fps);
	    this.last_msec = now;
	    this.tick_count = 0;
	}
    }
}
