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

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(22, 16), 2));
const WARPIN_RESOURCE_ID = "enemies/basic5/eb5l1.png";
const Basic5: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	// todo: fix up all this weapon stuff, everywhere, just shoot me.
	// 1 weapon that swivels so there's only one clip to avoid too many shots. :-(
	const [ews] = Ebw.scale_specs(db.shared.level_index1, S.Rank.basic, true);
	const weapons = {
            'w': Ebw.weapon_mk(ews),
	};
	const flight_pattern = new Fp.DecendAndGoSine(
	    db,
	    SIZE,
	    Rnd.singleton.v2d_around(G.v2d_mk_nn(0.0008), G.v2d_mk_nn(0.0001)),
	    db.shared.world.gameport.world_bounds.size.y * 0.3
	);
	const spec: Emk.EnemySpec = {
            anim: anim,
            rank: S.Rank.basic,
            hp_init: K.ENEMY_BASIC_HP,
            damage: K.ENEMY_BASIC_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_BASIC_GEM_COUNT,
	};
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Basic5;

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        ...t2a_facing_mk(db, true, F.Facing.left),
        ...t2a_facing_mk(db, true, F.Facing.right),
	// i'm lazy: still animating thrusters.
        ...t2a_facing_mk(db, false, F.Facing.left),
        ...t2a_facing_mk(db, false, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

function f2s(f: F.Facing): string {
    return F.on_facing(f, "l", "r");
}
const tspecs: Array<[number, string]> = [[1,""]];
function t2a_facing_mk(db: GDB.GameDB, thrusting: boolean, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    const fstr = f2s(facing);
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
                        ...images.lookup_range_n(n => `enemies/basic5/eb5${fstr}${n}.png`, 1, 4)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop,
                }
	    )
        });
    });
    return table;
}
