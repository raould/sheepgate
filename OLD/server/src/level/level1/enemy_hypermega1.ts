/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as C from '../../collision';
import * as Ebw from '../../enemy/enemy_ball_weapon';
import * as Fp from '../../enemy/flight_patterns';
import * as Emk from '../../enemy/enemy_mk';
import * as Lemk from '../enemy_mk';
import * as K from '../../konfig';

// match: sprite animation.
const SIZE = K.vd2si(G.v2d_scale_i(G.v2d_mk(80, 80), 1.5));
const WARPIN_RESOURCE_ID = "enemies/e10hm/e10_hm3.png";
const Hypermega: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const [ewsl, ewsr] = Ebw.scale_specs(db.shared.level_index1, S.Rank.hypermega, true);
	const weapons = {
            'wl': Ebw.weapon_mk(ewsl),
            'wr': Ebw.weapon_mk(ewsr),
	};
	const flight_pattern = new Fp.DescendAndGoSine(
	    db,
	    SIZE,
	    G.v2d_mk_nn(0.0005)
	);
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
            {
		fighter_kind: "hypermega",
		in_cmask: C.CMask.enemy_bounce,
		anim: anim,
		rank: S.Rank.hypermega,
		hp_init: K.ENEMY_HYPERMEGA_HP,
		damage: K.ENEMY_HYPERMEGA_DAMAGE,
		weapons: weapons,
		shield_scale: G.v2d_mk_nn(1.1),
		flight_pattern: flight_pattern,
		gem_count: K.ENEMY_HYPERMEGA_GEM_COUNT
            }
	);
    }
}
export default Hypermega;

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        // enemy doesn't show any thrusters.
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
            facing: facing,
            thrusting: thrusting,
            t: t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
                    frame_msec: 120,
                    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/e10hm/e10_hm${n}.png`, 1, 5)
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.bounce
                }
            )
        });
    });
    return table;
}
