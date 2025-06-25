/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';
import Eb1 from './enemy_basic1';
import Eb2 from './enemy_basic2'; // todo:

export interface EnemyGeneratorSpec {
    kind: string;
    comment: string;
    generations: number;
    max_alive: number;
    warpin: (db: GDB.GameDB) => U.O<S.Warpin>;
    delay_msec: number;
    tick_msec: number;
}

interface EnemyGenerationCounts {
    generated: number;
    generations: number;
}

interface EnemyGenerationState {
    pod: EnemyGenerationCounts;
    small: EnemyGenerationCounts;
    mega: EnemyGenerationCounts;
    hypermega: EnemyGenerationCounts;
    hm_basic1: EnemyGenerationCounts;
    hm_basic2: EnemyGenerationCounts;
}

export interface AddGeneratorsSpec {
    // the basics are omittied, not for export.
    pod?: EnemyGeneratorSpec;
    small?: EnemyGeneratorSpec;
    mega?: EnemyGeneratorSpec;
    hypermega?: EnemyGeneratorSpec;
}

// todo: ugly, but basic 1 and 2 are hard-coded to spawn along with the hypermega.
const hm_basic1: EnemyGeneratorSpec = {
    kind: "hm_basic1",
    generations: 2,
    max_alive: 2,
    comment: `enemy-hm_b1-from-adv`,
    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
	return Eb1.warpin_mk(db);
    },
    delay_msec: 1,
    tick_msec: 100,
};
const hm_basic2: EnemyGeneratorSpec = {
    kind: "hm_basic2",
    generations: 2,
    max_alive: 2,
    comment: `enemy-hm_b2-from-adv`,
    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
	return Eb2.warpin_mk(db);
    },
    delay_msec: 1,
    tick_msec: 100,
};

type TestFn = (db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState) => boolean;
type IncrFn = (state: EnemyGenerationState) => void;

export function add_generators(
    db: GDB.GameDB,
    spec: AddGeneratorsSpec
) {
    const has_hypermega = spec.hypermega?.generations ?? 0 > 0;
    // this could probably be more programmatic, less copy-paste.
    const state: EnemyGenerationState = {
        pod: { generated: 0, generations: spec.pod?.generations ?? 0 },
        small: { generated: 0, generations: spec.small?.generations ?? 0 },
        mega: { generated: 0, generations: spec.mega?.generations ?? 0 },
        hypermega: { generated: 0, generations: spec.hypermega?.generations?? 0 },
	hm_basic1: { generated: 0, generations: has_hypermega ? hm_basic1.generations : 0 },
	hm_basic2: { generated: 0, generations: has_hypermega ? hm_basic2.generations : 0 },
    };
    add_generator(db, state, spec.pod, should_generate_pod, (s) => { s.pod.generated++; });
    add_generator(db, state, spec.small, should_generate_small, (s) => { s.small.generated++; });
    add_generator(db, state, spec.mega, should_generate_mega, (s) => { s.mega.generated++; });
    add_generator(db, state, spec.hypermega, should_generate_hypermega, (s) => { s.hypermega.generated++; });
    if (has_hypermega) {
	add_generator(db, state, hm_basic1, should_generate_hm_basic1, (s) => { s.hm_basic1.generated++ });
	add_generator(db, state, hm_basic2, should_generate_hm_basic2, (s) => { s.hm_basic2.generated++ });
    }
}

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
                delay_msec: spec.delay_msec,
                tick_msec: spec.tick_msec,
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

function should_generate_pod(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = state.pod.generated < spec.generations;
    if (running) {
        const room = spec.max_alive > count_rank(db, S.Rank.basic);
        return room;
    }
    return false;
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

function should_generate_hm_basic1(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.hm_basic1.generated < spec.generations;
    return activated && available;
}

function should_generate_hm_basic2(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const activated = state.hypermega.generated > 0;
    const available = state.hm_basic2.generated < spec.generations;
    return activated && available;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec): U.O<S.Warpin> {
    const e = spec.warpin(db);
    if (U.exists(e)) {
	GDB.add_item(db.shared.items.warpin, e);
    }
    return e;
}
