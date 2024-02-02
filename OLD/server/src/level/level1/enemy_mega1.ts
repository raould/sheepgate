import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as Ebw from '../../enemy/enemy_ball_weapon';
import * as Fp from '../../enemy/flight_patterns';
import * as E from '../../enemy/enemy_mk';
import * as K from '../../konfig';

// match: sprite animation.
export const SIZE = G.v2d_mk(55, 55);
export const WARPIN_RESOURCE_ID = "enemies/e10m/e10_m1.png";

export function warpin_mk(db: GDB.GameDB): U.O<S.Sprite> {
    const anim = new A.AnimatorDimensions(anims_spec_mk(db));
    const [ewsl, ewsr] = Ebw.scale_specs(S.Scale.mega, true);
    const weapons = {
        'wl': Ebw.weapon_mk(ewsl),
        'wr': Ebw.weapon_mk(ewsr),
    };
    const flight_pattern = new Fp.DecendAndGoStraight(db, SIZE, 0.001);
    return E.warpin_mk(
        db,
        SIZE,
    	WARPIN_RESOURCE_ID,
        {
            anim: anim,
            scale: S.Scale.mega,
            hp_init: K.ENEMY_MEGA_HP,
            damage: K.ENEMY_MEGA_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_MEGA_GEM_COUNT
        }
    );
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

const tspecs: Array<[number, string]> = [[1,""]];
function t2a_facing_mk(db: GDB.GameDB, thrusting: boolean, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing,
            thrusting,
            t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
                    frame_msec: 120,
                    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/e10m/e10_m${n}.png`, 1, 5)
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.repeat
                }
            )
        });
    });
    return table;
}
