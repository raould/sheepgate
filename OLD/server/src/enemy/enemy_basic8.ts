import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Ebw from './enemy_bullet_weapon';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as K from '../konfig';
import * as Rnd from '../random';

// match: sprite animation.
const SIZE = G.v2d_scale_i(G.v2d_mk(26, 10), 2);
const WARPIN_RESOURCE_ID = "enemies/basic8/defl.png";
const Basic8: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	// todo: fix up all this weapon stuff, everywhere, just shoot me.
	// 1 weapon that swivels so there's only one clip to avoid too many shots. :-(
	const [ews] = Ebw.scale_specs(db.shared.level_index1, S.Rank.basic);
	const weapons = {
            'w': Ebw.weapon_mk(ews),
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
	const spec: Emk.EnemySpec = {
            anim: anim,
            rank: S.Rank.basic,
            hp_init: K.ENEMY_BASIC_HP,
            damage: K.ENEMY_BASIC_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_BASIC_GEM_COUNT,
	};
	return Emk.warpin_mk(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Basic8;

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
		    frame_msec: 40,
		    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/basic8/def${fstr}t${n}.png`, 1, 2)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.bounce,
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
		    resource_id: images.lookup(`enemies/basic8/def${fstr}.png`)
		}
            )
        });
    });
    return table;
}
