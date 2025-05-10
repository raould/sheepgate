import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Ebw from '../enemy/enemy_ball_weapon';
import * as Fp from '../enemy/flight_patterns';
import * as Emk from '../enemy/enemy_mk';
import * as Lemk from './enemy_mk';
import * as K from '../konfig';

// match: sprite animation.
const SIZE = G.v2d_scale(G.v2d_mk(32, 32), 1);
const WARPIN_RESOURCE_ID = "enemies/basic2/tt1.png";
const Basic2: Lemk.EnemyMk = {
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
	const flight_pattern = new Fp.DecendAndGoSine(db, SIZE, 0.0005);
	const spec: Emk.EnemySpec = {
            anim: anim,
            rank: S.Rank.basic,
            hp_init: K.ENEMY_BASIC_HP,
            damage: K.ENEMY_BASIC_DAMAGE,
	    hide_bar: true,
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
export default Basic2;

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
                        ...images.lookup_range_n(n => `enemies/basic2/tt${n}.png`, 1, 3)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.bounce
                }
	    )
        });
    });
    return table;
}
