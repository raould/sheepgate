import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as Ebw from '../../enemy/enemy_ball_weapon';
import * as Rnd from '../../random';
import * as Fp from '../../enemy/flight_patterns';
import * as Emk from '../../enemy/enemy_mk';
import * as Lemk from '../enemy_mk';
import * as K from '../../konfig';

// match: sprite animation.
export const SIZE = G.v2d_scale_i(G.v2d_mk(256, 286), 0.2);
export const WARPIN_RESOURCE_ID = "enemies/e22/hh1.png";
const Small: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const [ewsl, ewsr] = Ebw.scale_specs(db.shared.level_index1, S.Rank.small, false);
	const weapons = {
            'wl': Ebw.weapon_mk(ewsl),
            'wr': Ebw.weapon_mk(ewsr),
	};
	const acc_base = G.v2d_mk(0.0005, 0.00005);
	const acc = Rnd.singleton.next_v2d_around(
            acc_base,
            G.v2d_scale(acc_base, 0.5)
	);
	const flight_pattern = new Fp.BuzzPlayer(db, acc);
	return Emk.warpin_mk(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
            {
		anim: anim,
		rank: S.Rank.small,
		hp_init: K.ENEMY_SMALL_HP,
		damage: K.ENEMY_SMALL_DAMAGE,
		weapons: weapons,
		flight_pattern: flight_pattern,
		gem_count: K.ENEMY_SMALL_GEM_COUNT
            }
	);
    }
}
export default Small;

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
                    frame_msec: 250,
                    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/e22/hh${n}.png`, 1, 2)
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.loop
                }
            )
        });
    });
    return table;
}
