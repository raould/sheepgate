/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';

// doesn't care how many other enemies of types exist.

export interface EnemyGeneratorSpec {
    kind: string,
    generations: number;
    max_alive: number;
    comment: string;
    warpin: (db: GDB.GameDB, dbid: GDB.DBID) => U.O<S.Warpin>;
    delay_msec: number;
    tick_msec: number;
}

interface EnemyGenerationCounts {
    generated: number;
    generations: number;
}

export function add_generators(
    db: GDB.GameDB,
    specs: EnemyGeneratorSpec[]
) {
    specs.forEach((spec) => {
	const counts = { generated: 0, generations: spec.generations };
	add_generator(db, spec, counts, should_generate, (c) => { c.generated++; });
    });
}

type TestFn = (db: GDB.GameDB, spec: EnemyGeneratorSpec, counts: EnemyGenerationCounts) => boolean;
type IncrFn = (counts: EnemyGenerationCounts) => void;

function add_generator(
    db: GDB.GameDB,
    spec: EnemyGeneratorSpec,
    counts: EnemyGenerationCounts,
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
                    if (testfn(db, spec, counts)) {
                        const e = add_enemy(db, spec);
                        incrfn(counts);
                        return e;
                    }
                }
            })
    );
}

function count_kind(db: GDB.GameDB, kind: string): number {
    const alive = Object.values(db.shared.items.enemies).filter(e => e.kind == kind).length;
    const warping = Object.values(db.shared.items.warpin).filter(e => e.kind == kind).length;
    return alive + warping;
}

function should_generate(db: GDB.GameDB, spec: EnemyGeneratorSpec, counts: EnemyGenerationCounts): boolean {
    const available = counts.generated < spec.generations;
    const room = count_kind(db, spec.kind) < spec.max_alive;
    return available && room;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

