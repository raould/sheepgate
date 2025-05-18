import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as Ebw from '../../enemy/enemy_bullet_weapon';
import * as Rnd from '../../random';
import * as Fp from '../../enemy/flight_patterns';
import * as Emk from '../../enemy/enemy_mk';
import * as Lemk from '../enemy_mk';
import * as K from '../../konfig';

// match: sprite animation.
const SIZE = G.v2d_scale_v2d_i(G.v2d_mk(95, 33), G.v2d_mk(1, 0.8));
const WARPIN_RESOURCE_ID = "enemies/e17/e17l.png";
const Mega: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const [ewsl, ewsr] = Ebw.scale_specs(db.shared.level_index1, S.Rank.mega);
	const weapons = {
            'wl': Ebw.weapon_mk(ewsl),
            'wr': Ebw.weapon_mk(ewsr),
	};
	const acc_base = G.v2d_mk(
            K.PLAYER_DELTA_X_ACC * 0.5,
            K.PLAYER_DELTA_X_ACC * 0.1
	);
	const acc = Rnd.singleton.v2d_around(
            acc_base,
            G.v2d_scale(acc_base, 0.3)
	);
	const flight_pattern = new Fp.BuzzPlayer(db, acc);
	return Emk.warpin_mk(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
            {
		anim: anim,
		rank: S.Rank.mega,
		hp_init: K.ENEMY_MEGA_HP,
		damage: K.ENEMY_MEGA_DAMAGE,
		weapons: weapons,
		flight_pattern: flight_pattern,
		gem_count: K.ENEMY_MEGA_GEM_COUNT,
		// todo: these should really come from magic pixels in the image resources.
		hardpoint_left: (r: G.Rect): G.V2D => {
                    return G.v2d_add(
			G.rect_lm(r),
			G.v2d_mk_0y(3)
                    );
		},
		hardpoint_right: (r: G.Rect): G.V2D => {
                    return G.v2d_add(
			G.rect_rm(r),
			G.v2d_mk_0y(3)
                    );
		},
            }
	);
    }
}
export default Mega;

function f2s(f: F.Facing): string {
    return F.on_facing(f, "l", "r");
}

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        ...t2a_thrusting_facing_mk(db, F.Facing.left),
        ...t2a_thrusting_facing_mk(db, F.Facing.right),
        ...t2a_still_facing_mk(db, F.Facing.left),
        ...t2a_still_facing_mk(db, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

const tspecs: Array<[number, string]> = [[1,""]];
function t2a_thrusting_facing_mk(db: GDB.GameDB, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    const fstr = f2s(facing);
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing,
            thrusting: true,
            t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
                    frame_msec: 50,
                    resource_ids: [
			images.lookup(`enemies/e17/e17${fstr}.png`),
			images.lookup(`enemies/e17/e17${fstr}_0.png`),
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.loop
                }
            )
        });
    });
    return table;
}

function t2a_still_facing_mk(db: GDB.GameDB, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    const fstr = f2s(facing);
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing,
            thrusting: false,
            t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
		    resource_id: images.lookup(`enemies/e17/e17${fstr}.png`)
		}
            )
        });
    });
    return table;
}
