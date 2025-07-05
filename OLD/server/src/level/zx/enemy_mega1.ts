/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../../game_db';
import * as S from '../../sprite';
import * as G from '../../geom';
import * as A from '../../animation';
import * as U from '../../util/util';
import * as F from '../../facing';
import * as Ebw from '../../enemy/enemy_bullet_weapon';
import * as Fp from '../../enemy/flight_patterns';
import * as Emk from '../../enemy/enemy_mk';
import * as Lemk from '../enemy_mk';
import * as K from '../../konfig';
import * as Rnd from '../../random';

// match: sprite animation.
const SIZE = K.vd2si(G.v2d_scale_i(G.v2d_mk(55, 34), 1.5));
const WARPIN_RESOURCE_ID = "enemies/zx3/zxR.png";
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
            K.PLAYER_DELTA_X_ACC * 0.3,
            K.PLAYER_DELTA_X_ACC * 0.1
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
		fighter_kind: "mega",
		explosion_kind: S.ExplosionKind.cbm,
		anim: anim,
		rank: S.Rank.mega,
		hp_init: K.ENEMY_MEGA_HP,
		damage: K.ENEMY_MEGA_DAMAGE,
		weapons: weapons,
		flight_pattern: flight_pattern,
		gem_count: K.ENEMY_MEGA_GEM_COUNT
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
    return F.on_facing(f, "L", "R");
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
                    frame_msec: 50,
                    resource_ids: [
                        images.lookup(`enemies/zx3/zx${fstr}.png`),
                        images.lookup(`enemies/zx3/zx${fstr}T.png`),
                    ],
                    starting_mode: A.MultiImageStartingMode.hold,
                    ending_mode: A.MultiImageEndingMode.loop
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
                { resource_id: images.lookup(`enemies/zx3/zx${fstr}.png`) }
            )
        });
    });
    return table;
}
