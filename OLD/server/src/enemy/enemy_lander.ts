/* Copyright (C) 2026-2026 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Eu from './enemy_util';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as Rnd from '../random';
import * as K from '../konfig';

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(16, 16), 2));
const WARPIN_RESOURCE_ID = "enemies/lander/lander0.png";
const Lander: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const weapons = {};
	const acc = G.v2d_mk(
	    Eu.level_scale_up(db.shared.level_index1, 0.0002, 0.0002),
	    Eu.level_scale_up(db.shared.level_index1, 0.0005, 0.001),
	);
	const flight_pattern = new LanderAttackPattern();
	const spec: Emk.EnemySpec = {
	    fighter_kind: "lander",
            anim: anim,
            rank: S.Rank.small,
            hp_init: K.ENEMY_LANDER_HP,
            damage: K.ENEMY_LANDER_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_LANDER_GEM_COUNT,
	};
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Lander;

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
	    facing: facing,
	    thrusting: thrusting,
	    t: t,
	    animator: A.animator_mk(
                db.shared.sim_now,
                {
		    frame_msec: 40,
		    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/lander/lander${n}.png`, 0, 3)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop,
                }
	    )
        });
    });
    return table;
}

// todo: seek victims. make sure no more than 1 lander per victim.
class LanderAttackPattern implements Fp.FlightPattern {
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
      	return G.v2d_mk_0();
    }
}
