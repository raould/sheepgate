/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as C from '../collision';
import * as Sh from '../fighter_shield';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Fp from '../enemy/flight_patterns';
import * as Emk from '../enemy/enemy_mk';
import * as K from '../konfig';

const FLYING_SFX = { sfx_id: K.SMARTBOMB_SFX, gain: 0.4, singleton: true };

// match: sprite animation.
export const SIZE = G.v2d_mk(20, 20);

export function smartbomb_mk(db: GDB.GameDB, lt: G.V2D): U.O<S.Enemy> {
    const anim = new A.AnimatorDimensions(anims_spec_mk(db));
    // todo: the acc here should come from the per-level konfig. :-\
    const flight_pattern = new Fp.TargetPlayer(db, 500, 0.0005);
    const rect = G.rect_mk(lt, SIZE);
    const spec = {
        lt: lt,
        anim: anim,
        rank: S.Rank.small,
        hp_init: 1,
        damage: K.PLAYER_HP / 2,
        weapons: {},
        flight_pattern: flight_pattern,
        gem_count: 0,
        shield_alpha: Number.EPSILON, // can't use 0 here, that's "hidden".
    };
    const images = db.uncloned.images;
    const sprite = GDB.add_sprite_dict_id_mut(
        db.shared.items.enemies,
        (dbid: GDB.DBID): U.O<S.Enemy> => Emk.sprite_mk(db, rect, spec)
    );
    // unfortunately enemy collisions don't work w/out shields.
    if (sprite != null) {
        add_shield(db, sprite, spec);
    }
    return sprite;
}

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        ...t2a_facing_mk(db, true, F.Facing.left),
        ...t2a_facing_mk(db, true, F.Facing.right),
        ...t2a_facing_mk(db, false, F.Facing.left),
        ...t2a_facing_mk(db, false, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

const tspecs: Array<[number, string]> = [[1, ""]];
function t2a_facing_mk(db: GDB.GameDB, thrusting: boolean, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    let fronts = images.lookup_range_n(n => `enemies/smartbomb/s${n}.png`, 1, 5);
    const back = images.lookup("enemies/smartbomb/s6.png");
    if (facing == F.Facing.right) { fronts.reverse(); }
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing: facing,
            thrusting: thrusting,
            t: t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
                    frame_msec: 60,
                    resource_ids: [...fronts, back, back, back],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.loop
                }
            )
        });
    });
    return table;
}

function add_shield(db: GDB.GameDB, enemy: S.Enemy, spec: Emk.EnemySpec) {
    const images = db.uncloned.images;
    Sh.add_fighter_shield(db, {
        resource_id: images.lookup("shield/shield2.png"),
        enlarge: K.SHIELD_SCALE,
        fighter: enemy,
        hp_init: spec.hp_init,
        damage: spec.damage,
        comment: `enemy-FF-shield-${enemy.dbid}`,
        in_cmask: C.CMask.enemy,
        from_cmask: C.CMask.player | C.CMask.playerShot,
        alpha: spec.shield_alpha,
    });
}
