/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Ebw from './enemy_ball_weapon';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as K from '../konfig';
import * as Rnd from '../random';

const FLYING_SFX = { sfx_id: K.SWARMER_SFX, gain: 0.1, playback_rate: 2, singleton: true };
export const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(8, 8), 1));
const WARPIN_RESOURCE_ID = "enemies/swarmers/sprite_20.png";

export function spec_mk(db: GDB.GameDB): Emk.EnemySpec {
    const anim = new A.AnimatorDimensions(anims_spec_mk(db));
    const acc = G.v2d_mk(
	Rnd.singleton.float_range(0.0003, 0.0007),
	Rnd.singleton.float_range(0.0001, 0.0004)
    );
    const flight_pattern = new Fp.TargetPlayer(db, 500, acc);
    return {
        anim: anim,
        rank: S.Rank.basic,
        hp_init: K.ENEMY_SWARMER_HP,
        damage: K.ENEMY_SWARMER_DAMAGE,
        weapons: {},
        flight_pattern: flight_pattern,
        gem_count: 0,
	flying_sfx: FLYING_SFX,
    };
}

const Swarmer: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec_mk(db)
	);
    }
}
// todo: spawn swarmers on death.
export default Swarmer;

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
		    frame_msec: Rnd.singleton.float_around(50, 20),
		    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/swarmers/sprite_2${n}.png`, 0, 7)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop
                }
	    )
        });
    });
    return table;
}
