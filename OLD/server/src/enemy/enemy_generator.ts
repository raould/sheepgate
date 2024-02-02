import * as GDB from '../game_db';
import * as Tkg from '../ticking_generator';
import * as S from '../sprite';
import * as U from '../util/util';
import * as D from '../debug';

export interface EnemyGeneratorSpec {
    generations: number;
    max_alive: number;
    comment: string;
    warpin: (db: GDB.GameDB, dbid: GDB.DBID) => U.O<S.Warpin>;
}

interface EnemySizeGenerationState {
    generated: number;
    generations: number;
}
interface EnemyGenerationState {
    small: EnemySizeGenerationState,
    mega: EnemySizeGenerationState,
    hypermega: EnemySizeGenerationState
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
        };
        add_generator(db, state, small_spec, should_generate_small, (s) => { s.small.generated += 1; });
        add_generator(db, state, mega_spec, should_generate_mega, (s) => { s.mega.generated += 1; });
        add_generator(db, state, hypermega_spec, should_generate_hypermega, (s) => { s.hypermega.generated += 1; });
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
                            const e = add_enemy(db, spec, state);
                            incrfn(state);
                            return e;
                        }
                    }
                })
        );
}

function count_scale(db: GDB.GameDB, scale: S.Scale): number {
    const alive = Object.values(db.shared.items.enemies).filter(e => e.scale == scale).length;
    const warping = Object.values(db.shared.items.warpin).filter(e => e.scale == scale).length;
    return alive + warping;
}

function should_generate_small(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = spec.generations > state.small.generated;
    if (running) {
        const room = spec.max_alive > count_scale(db, S.Scale.small);
        return room;
    }
    return false;
}

function should_generate_mega(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = spec.generations > state.mega.generated;
    if (running) {
        const room = spec.max_alive > count_scale(db, S.Scale.mega);
        const small_done = state.small.generated >= state.small.generations;
        const small_withered = Math.max(1, Math.floor(state.small.generations / 2)) >= count_scale(db, S.Scale.small);
        return room && small_done && small_withered;
    }
    return false;
}

function should_generate_hypermega(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): boolean {
    const running = spec.generations > state.hypermega.generated;
    if (running) {
        const room = spec.max_alive > count_scale(db, S.Scale.hypermega);
        const small_done = state.small.generated >= state.small.generations;
        const small_dead = 0 == count_scale(db, S.Scale.small);
        const mega_done = state.mega.generated >= state.mega.generations;
        const mega_dead = 0 == count_scale(db, S.Scale.mega);
        return room && small_done && small_dead && mega_done && mega_dead;
    }
    return false;
}

function add_enemy(db: GDB.GameDB, spec: EnemyGeneratorSpec, state: EnemyGenerationState): U.O<S.Warpin> {
    const e = GDB.add_dict_id_mut(
        db.shared.items.warpin,
        (dbid: GDB.DBID): U.O<S.Warpin> => spec.warpin(db, dbid)
    );
    return e;
}

