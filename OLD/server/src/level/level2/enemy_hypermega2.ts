import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as Ebw from '../../enemy/enemy_ball_weapon';
import * as Fp from '../../enemy/flight_patterns';
import * as Emk from '../../enemy/enemy_mk';
import * as Lemk from '../enemy_mk';
import * as K from '../../konfig';
import * as Esbw from '../../enemy/enemy_smartbomb_weapon';

// match: sprite animation.
const SIZE = G.v2d_mk(78, 128);
const WARPIN_RESOURCE_ID = "enemies/e11/e11a.png";
const Hypermega: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	const [ewsl, ewsr] = Ebw.scale_specs(db.shared.level_index1, S.Rank.hypermega, true);
	const ewsb = Esbw.get_spec();
	const weapons = {
            'wl': Ebw.weapon_mk(ewsl),
            'wr': Ebw.weapon_mk(ewsr),
            'wsb': Esbw.weapon_mk(ewsb),
	};
	const flight_pattern = new Fp.DecendAndGoSine(db, SIZE, 0.0005);
	return Emk.warpin_mk(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
            {
		anim: anim,
		rank: S.Rank.hypermega,
		hp_init: K.ENEMY_HYPERMEGA_HP,
		damage: K.ENEMY_HYPERMEGA_DAMAGE,
		weapons: weapons,
		flight_pattern: flight_pattern,
		gem_count: K.ENEMY_HYPERMEGA_GEM_COUNT
            }
	);
    }
}
export default Hypermega;

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        // enemy e12 doesn't show any thrusters.
        ...t2a_facing_mk(db, true, F.Facing.left),
        ...t2a_facing_mk(db, true, F.Facing.right),
        ...t2a_facing_mk(db, false, F.Facing.left),
        ...t2a_facing_mk(db, false, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

// enemy e11 is a single image at the moment.
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
                    resource_id: images.lookup("enemies/e11/e11a.png"),
                }
            )
        });
    });
    return table;
}
