/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';
import * as D from '../debug';

// doesn't care how many other enemies of types exist.
// if there are several specs, it tries to not have them being
// generated at the same time, in order to avoid things looking too cluttered.

export interface EnemyGeneratorSpec {
    fighter_kind: string,
    generations: number;
    max_alive: number;
    comment: string;
    warpin: (db: GDB.GameDB, dbid: GDB.DBID) => U.O<S.Warpin>;
    delay_msec: number;
    tick_msec: number;
}

interface EnemyGenerationCount {
    running: boolean;
    generated: number;
}

export function add_generators(
    db: GDB.GameDB,
    specs: EnemyGeneratorSpec[]
) {
    const counts = specs.map((spec, i) => {
	return { generated: 0, running: i === 0 };
    });
    specs.forEach((spec, i) => {
	add_generator(db, spec, counts[i], counts, should_generate, (c) => { c.generated++; });
    });
}

type TestFn = (db: GDB.GameDB, spec: EnemyGeneratorSpec, count: EnemyGenerationCount, counts: EnemyGenerationCount[]) => boolean;
type IncrFn = (counts: EnemyGenerationCount) => void;

function add_generator(
    db: GDB.GameDB,
    spec: EnemyGeneratorSpec,
    count: EnemyGenerationCount,
    counts: EnemyGenerationCount[],
    testfn: TestFn,
    incrfn: IncrFn) {
    GDB.add_dict_id_mut(
        db.local.enemy_generators,
        (dbid: GDB.DBID): U.O<Tkg.TickingGenerator<S.Sprite>> =>
            Tkg.ticking_generator_mk(db, dbid, {
                comment: spec.comment,
                generations: spec.generations,
                delay_msec: spec.delay_msec,
                tick_msec: spec.tick_msec,
                generate: (db: GDB.GameDB): U.O<S.Sprite> => {
                    if (testfn(db, spec, count, counts)) {
                        const e = add_enemy(db, spec);
                        incrfn(count);
                        return e;
                    }
                },
		on_expiry: (db: GDB.GameDB): void => {
		    D.assert(count.generated === spec.generations, spec.comment);
		    count.running = false;
		}
            })
    );
}

function count_kind(db: GDB.GameDB, fighter_kind: string): number {
    const alive = Object.values(db.shared.items.enemies).filter(e => e.fighter_kind == fighter_kind).length;
    const warping = Object.values(db.shared.items.warpin).filter(e => e.fighter_kind == fighter_kind).length;
    return alive + warping;
}

function should_generate(db: GDB.GameDB, spec: EnemyGeneratorSpec, count: EnemyGenerationCount, counts: EnemyGenerationCount[]): boolean {
    D.log(spec.comment, counts);
    // somebody else is already running?
    const busy = counts.some(c => c !== count && c.running);
    if (busy) {
	D.log("busy", spec.comment);
	return false;
    }
    // a) already running.
    //    a.1) done?
    //    a.2) not done.
    // b) not running & never ran / not done.
    //    start (since not busy).
    const done = count.generated >= spec.generations;
    D.log("done?", done, spec.comment)
    if (count.running) {
	D.log("running", spec.comment);
	if (done) {
	    D.log("done", spec.comment);
	    count.running = false;
	    return false;
	}
	else {
	    const should = count_kind(db, spec.fighter_kind) < spec.max_alive;
	    D.log("room?", should, spec.comment);
	    return should;
	}
    }
    else if (!done) {
	D.log("starting!", spec.comment);
	count.running = true;
	return true;
    }
    return false;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

