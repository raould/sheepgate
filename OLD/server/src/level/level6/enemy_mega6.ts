/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
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
const SIZE = K.vd2si(G.v2d_scale_i(G.v2d_mk(130, 54), 0.6));
const WARPIN_RESOURCE_ID = "enemies/e26/e26l.png";
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
            K.PLAYER_DELTA_X_ACC * 0.3,
	);
	const acc = Rnd.singleton.v2d_around(
            acc_base,
            G.v2d_scale(acc_base, 0.5)
	);
	const flight_pattern = new Fp.BuzzPlayer(db, acc);
	return Emk.warpin_mk_enemy(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
            {
		kind: "mega",
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

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        ...t2a_thrusting_facing_mk(db, F.Facing.left),
        ...t2a_thrusting_facing_mk(db, F.Facing.right),
        ...t2a_still_facing_mk(db, F.Facing.left),
        ...t2a_still_facing_mk(db, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

function f2s(f: F.Facing): string {
    return F.on_facing(f, "l", "r");
}
const tspecs: Array<[number, string]> = [[1,""]];
function t2a_thrusting_facing_mk(db: GDB.GameDB, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    const fstr = f2s(facing);
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing: facing,
            thrusting: true,
            t: t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
                    frame_msec: 80,
                    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/e26/e26t${n}${fstr}.png`, 1, 2),
			images.lookup(`enemies/e26/e26${fstr}.png`),
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.bounce
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
            facing: facing,
            thrusting: false,
            t: t,
            animator: A.animator_mk(
                db.shared.sim_now,
                { resource_id: images.lookup(`enemies/e26/e26${fstr}.png`) }
            )
        });
    });
    return table;
}

