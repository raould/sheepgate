import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';
import * as Rnd from '../random';
import * as D from '../debug';

// doesn't care how many other enemies of types exist.

export interface EnemyGeneratorSpec {
    generations: number;
    max_alive: number;
    comment: string;
    warpin: (db: GDB.GameDB, dbid: GDB.DBID) => U.O<S.Warpin>;
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
                delay_msec: 2000,
                tick_msec: Rnd.singleton.float_around(3000, 100),
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

function should_generate(db: GDB.GameDB, spec: EnemyGeneratorSpec, counts: EnemyGenerationCounts): boolean {
    return spec.generations > counts.generated && Rnd.singleton.boolean(0.5);
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

