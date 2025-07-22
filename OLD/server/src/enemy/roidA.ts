/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as K from '../konfig';
import * as Rnd from '../random';

// this one is different than most, it is indestructible.

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_v2d(G.v2d_mk(16, 16), G.v2d_mk(2,1)));
const WARPIN_RESOURCE_ID = "roids/roidA0.png";
const RoidA: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const flight_pattern = new Fp.DecendAndGoSine(
	    db,
	    SIZE,
	    Rnd.singleton.v2d_around(G.v2d_mk_nn(0.0001), G.v2d_mk_nn(0.0001)),
	);
	const spec: Emk.EnemySpec = {
	    fighter_kind: "roidA",
            anim,
            rank: S.Rank.basic,
            hp_init: K.HP_INDESTRUCTIBLE,
            damage: K.PLAYER_HP / 2,
            weapons: {},
            flight_pattern,
            gem_count: 0,
	};
	return Emk.warpin_mk_indestructible(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default RoidA;

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
		    frame_msec: 80,
		    resource_ids: [
                        ...images.lookup_range_n(n => `roids/roidA${n}.png`, 0, 3)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop
                }
	    )
        });
    });
    return table;
}
