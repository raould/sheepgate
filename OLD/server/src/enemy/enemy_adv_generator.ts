/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
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
    delay_msec?: number;
    tick_msec?: number;
}

// todo: ugly, but basic 1 and 2 are hard-coded to spawn along with the hypermega.
const basic1: EnemyGeneratorSpec = {
    generations: 2,
    max_alive: 2,
    comment: `enemy-b1-from-adv`,
    warpin: (db: GDB.GameDB, dbid: GDB.DBID): U.O<S.Warpin> => {
	return Eb1.warpin_mk(db);
    },
    delay_msec: 1,
    tick_msec: 2,
};
const basic2: EnemyGeneratorSpec = {
    generations: 2,
    max_alive: 2,
    comment: `enemy-b2-from-adv`,
    warpin: (db: GDB.GameDB, dbid: GDB.DBID): U.O<S.Warpin> => {
	return Eb2.warpin_mk(db);
    },
    delay_msec: 1,
    tick_msec: 2,
};

interface EnemyGenerationCounts {
    generated: number;
    generations: number;
}

interface EnemyGenerationState {
    small: EnemyGenerationCounts;
    mega: EnemyGenerationCounts;
    hypermega: EnemyGenerationCounts;
    basic1: EnemyGenerationCounts;
    basic2: EnemyGenerationCounts;
}

export interface AddGeneratorsSpec {
    small?: EnemyGeneratorSpec;
    mega?: EnemyGeneratorSpec;
    hypermega?: EnemyGeneratorSpec;
}

export function add_generators(
    db: GDB.GameDB,
    spec: AddGeneratorsSpec
) {
    const state: EnemyGenerationState = {
        small: { generated: 0, generations: spec.small?.generations ?? 0 },
        mega: { generated: 0, generations: spec.mega?.generations ?? 0 },
        hypermega: { generated: 0, generations: spec.hypermega?.generations?? 0 },
	basic1: { generated: 0, generations: basic1.generations },
	basic2: { generated: 0, generations: basic1.generations },
    };
    add_generator(db, state, spec.small, should_generate_small, (s) => { s.small.generated++; });
    add_generator(db, state, spec.mega, should_generate_mega, (s) => { s.mega.generated++; });
    add_generator(db, state, spec.hypermega, should_generate_hypermega, (s) => { s.hypermega.generated++; });
    add_generator(db, state, basic1, should_generate_basic1, (s) => { s.basic1.generated++ });
    add_generator(db, state, basic2, should_generate_basic2, (s) => { s.basic2.generated++ });
}

type TestFn = (db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState) => boolean;
type IncrFn = (state: EnemyGenerationState) => void;

function add_generator(
    db: GDB.GameDB,
    state: EnemyGenerationState,
    spec: EnemyGeneratorSpec | undefined,
    testfn: TestFn,
    incrfn: IncrFn) {
    if (spec == undefined) { return; }
    GDB.add_dict_id_mut(
        db.local.enemy_generators,
        (dbid: GDB.DBID): U.O<Tkg.TickingGenerator<S.Sprite>> =>
            Tkg.ticking_generator_mk(db, dbid, {
                comment: spec.comment,
                generations: spec.generations,
		// yes, buried default values is evil.
                delay_msec: spec.delay_msec ?? 1000,
                tick_msec: spec.tick_msec ?? 2000,
                generate: (db: GDB.GameDB): U.O<S.Sprite> => {
		    const yes = testfn(db, spec, state);
                    if (yes) {
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
	const should = room && small_done && small_dead && mega_done && mega_dead;
        return should;
    }
    return false;
}

function should_generate_basic1(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.basic1.generated < spec.generations;
    return activated && available;
}

function should_generate_basic2(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.basic2.generated < spec.generations;
    return activated && available;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

