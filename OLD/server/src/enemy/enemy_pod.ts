/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Es from './enemy_swarmer';
import * as Ebw from './enemy_ball_weapon';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as K from '../konfig';
import * as Rnd from '../random';

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(16, 16), 1));
const WARPIN_RESOURCE_ID = "enemies/pods/sprite_1.png";
const Pod: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const flight_pattern = new Fp.BuzzPlayer(db, G.v2d_mk(0.0001, 0.0001));
	const spec: Emk.EnemySpec = {
            anim: anim,
            rank: S.Rank.basic,
            hp_init: K.ENEMY_POD_HP,
            damage: K.ENEMY_POD_DAMAGE,
            weapons: {},
            flight_pattern: flight_pattern,
            gem_count: 0,
	    on_death: (db: GDB.GameDB, self: S.Enemy) => {
		const spawn_count = K.ENEMY_POD_SWARMER_COUNT +
		      Rnd.singleton.int_range(0, K.ENEMY_POD_SWARMER_COUNT);
		const ox = Es.SIZE.x;
		const oy = SIZE.y;
		for (let i = 0; i < spawn_count; ++i) {
		    Emk.add_enemy(
			db,
			Es.spec_mk(db),
			G.rect_move(
			    G.rect_mk(self.lt, Es.SIZE),
			    G.v2d_mk(
				ox*(i-Math.round(spawn_count/2)),
				oy*Rnd.singleton.sign()
			    ),
			),
			(db: GDB.GameDB) => db.shared.items.enemies
		    );
		}
	    },
	};
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Pod;

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
                        ...images.lookup_range_n(n => `enemies/pods/sprite_${n}.png`, 0, 3)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop
                }
	    )
        });
    });
    return table;
}
