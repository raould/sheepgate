/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as U from './util/util';

export interface TimeQueueItem {
    start(db: GDB.GameDB): void;
    step(db: GDB.GameDB): void;
    is_alive(db: GDB.GameDB): boolean;
}

export class TimeQueue {
    items: TimeQueueItem[];
    running: U.O<TimeQueueItem>;

    constructor() {
        this.items = [];
        this.running = undefined;
    }

    enqueue(item: TimeQueueItem): void {
        this.items.push(item);
    }

    step(db: GDB.GameDB): void {
        if (this.running != null) {
            this.running.step(db);
        }
        if (this.running?.is_alive(db) == false && this.items.length > 0) {
            this.running = this.items.shift();
            this.running!.start(db);
        }
    }
}
