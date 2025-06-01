/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as U from './util/util';

export interface TickingGeneratorSpec<T> {
    // if generations is not specified, that means 'never ending'.
    // if generations is specified, it is a 1-based count.
    generations?: number;

    // no delay specified means generate() is called on every step().
    delay_msec?: number;

    // the minimum amount of time between succesful generate()'s.
    tick_msec: number;

    comment?: string;

    // successful generation must return something not == null.
    // @param generation is a 0-based count.
    // @param generations is a 0-based count, if not specified means 'never ending'.
    generate: (db: GDB.GameDB, generation: number, generations: U.O<number>) => U.O<T>;
}

export interface TickingGenerator<T> extends GDB.Item, GDB.Aliveness {
    // step() checks after every tick_msec duration and if allowed runs the generate() function.
    step(db: GDB.GameDB): U.O<T>;
}

interface TickingGeneratorPrivate<T> extends TickingGenerator<T> {
    generations: U.O<number>;
    generation: number;
    delay_msec?: number;
    tick_msec: number;
    start_msec: number;
    last_tick_msec: number;
    is_alive(): boolean;
    generate: (db: GDB.GameDB, generation: number, generations: U.O<number>) => U.O<T>;
}

export function ticking_generator_mk<T>(db: GDB.GameDB, dbid: GDB.DBID, spec: TickingGeneratorSpec<T>): TickingGenerator<T> {
    const g: TickingGeneratorPrivate<T> = {
        ...spec,
        dbid: dbid,
        comment: spec.comment ?? `tick-gen-${dbid}`,
        generation: 0,
        generations: spec.generations ?? undefined,
        start_msec: db.shared.sim_now + (spec.delay_msec ?? 0),
        last_tick_msec: -1,
        step(db: GDB.GameDB): U.O<T> {
            const now = db.shared.sim_now;
            const started = now > this.start_msec;
            const tickable = (now - this.last_tick_msec) > this.tick_msec;
            if (this.is_alive() && started && tickable) {
                this.last_tick_msec = now;
                const g = this.generate(db, this.generation, this.generations);
                if (g != null) {
                    this.generation++;
                }
                return g;
            }
        },
        is_alive() {
            return this.generations == null || this.generation < this.generations;
        },
        get_lifecycle(db: GDB.GameDB) {
            return this.is_alive() ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
        },
        on_death(_: GDB.GameDB) {}
    };
    return g;
}
