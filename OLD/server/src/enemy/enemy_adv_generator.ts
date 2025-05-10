import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';
import * as D from '../debug';
import Eb1 from './enemy_basic1';
import Eb2 from './enemy_basic2'; // todo:

export interface EnemyGeneratorSpec {
    generations: number;
    max_alive: number;
    comment: string;
    warpin: (db: GDB.GameDB, dbid: GDB.DBID) => U.O<S.Warpin>;
}

const basic1_spec: EnemyGeneratorSpec = {
    generations: 2,
    max_alive: 2,
    comment: `enemy-b1-from-adv`,
    warpin: (db: GDB.GameDB, dbid: GDB.DBID): U.O<S.Warpin> => {
	return Eb1.warpin_mk(db);
    }
};

const basic2_spec: EnemyGeneratorSpec = {
    generations: 2,
    max_alive: 2,
    comment: `enemy-b2-from-adv`,
    warpin: (db: GDB.GameDB, dbid: GDB.DBID): U.O<S.Warpin> => {
	return Eb2.warpin_mk(db);
    }
};

interface EnemyGenerationCounts {
    generated: number;
    generations: number;
}

interface EnemyGenerationState {
    small: EnemyGenerationCounts,
    mega: EnemyGenerationCounts,
    hypermega: EnemyGenerationCounts
    // todo: this is an ugly hack, no doubt.
    basic1: EnemyGenerationCounts,
    basic2: EnemyGenerationCounts,
}

export function add_generators(
    db: GDB.GameDB,
    small_spec: EnemyGeneratorSpec,
    mega_spec: EnemyGeneratorSpec,
    hypermega_spec: EnemyGeneratorSpec
) {
    const state: EnemyGenerationState = {
        small: { generated: 0, generations: small_spec.generations },
        mega: { generated: 0, generations: mega_spec.generations },
        hypermega: { generated: 0, generations: hypermega_spec.generations },
	basic1: { generated: 0, generations: basic1_spec.generations },
	basic2: { generated: 0, generations: basic1_spec.generations },
    };
    add_generator(db, state, small_spec, should_generate_small, (s) => { s.small.generated++; });
    add_generator(db, state, mega_spec, should_generate_mega, (s) => { s.mega.generated++; });
    add_generator(db, state, hypermega_spec, should_generate_hypermega, (s) => { s.hypermega.generated++; });
    add_generator(db, state, basic1_spec, should_generate_basic1, (s) => { s.basic1.generated++ });
    add_generator(db, state, basic2_spec, should_generate_basic2, (s) => { s.basic2.generated++ });
}

type TestFn = (db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState) => boolean;
type IncrFn = (state: EnemyGenerationState) => void;

function add_generator(
    db: GDB.GameDB,
    state: EnemyGenerationState,
    spec: EnemyGeneratorSpec,
    testfn: TestFn,
    incrfn: IncrFn) {
    GDB.add_dict_id_mut(
        db.local.enemy_generators,
        (dbid: GDB.DBID): U.O<Tkg.TickingGenerator<S.Sprite>> =>
            Tkg.ticking_generator_mk(db, dbid, {
                comment: spec.comment,
                generations: spec.generations,
                delay_msec: 1000,
                tick_msec: 2000,
                generate: (db: GDB.GameDB): U.O<S.Sprite> => {
                    if (testfn(db, spec, state)) {
                        const e = add_enemy(db, spec);
                        incrfn(state);
                        return e;
                    }
                }
            })
    );
}

function count_rank(db: GDB.GameDB, rank: S.Rank): number {
    const alive = Object.values(db.shared.items.enemies).filter(e => e.rank == rank).length;
    const warping = Object.values(db.shared.items.warpin).filter(e => e.rank == rank).length;
    return alive + warping;
}

function should_generate_small(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = state.small.generated < spec.generations;
    if (running) {
        const room = spec.max_alive > count_rank(db, S.Rank.small);
        return room;
    }
    return false;
}

function should_generate_mega(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = state.mega.generated < spec.generations;
    if (running) {
        const room = spec.max_alive > count_rank(db, S.Rank.mega);
        const small_done = state.small.generated >= state.small.generations;
        const small_withered = Math.max(1, Math.floor(state.small.generations / 2)) >= count_rank(db, S.Rank.small);
        return room && small_done && small_withered;
    }
    return false;
}

function should_generate_hypermega(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = state.hypermega.generated < spec.generations;
    if (running) {
        const room = spec.max_alive > count_rank(db, S.Rank.hypermega);
        const small_done = state.small.generated >= state.small.generations;
        const small_dead = 0 == count_rank(db, S.Rank.small);
        const mega_done = state.mega.generated >= state.mega.generations;
        const mega_dead = 0 == count_rank(db, S.Rank.mega);
        return room && small_done && small_dead && mega_done && mega_dead;
    }
    return false;
}

function should_generate_basic1(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.small.generated < spec.generations;
    return activated && available;
}

function should_generate_basic2(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.small.generated < spec.generations;
    return activated && available;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

