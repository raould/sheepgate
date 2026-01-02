/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as A from '../animation';
import * as U from '../util/util';
import * as F from '../facing';
import * as Ebw from './enemy_ball_weapon';
import * as Eu from './enemy_util';
import * as Fp from './flight_patterns';
import * as Emk from './enemy_mk';
import * as Lemk from '../level/enemy_mk';
import * as Rnd from '../random';
import * as K from '../konfig';

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(16, 16), 2));
const WARPIN_RESOURCE_ID = "enemies/kamikaze/kamikaze1.png";
const Kamikaze: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	// todo: fix up all this weapon stuff, everywhere, just shoot me.
	// hack: trying to make the kamikazes more violent by having more weapons.
	const [ews1] = Ebw.scale_specs(db.shared.level_index1, S.Rank.small, true);
	const [ews2] = Ebw.scale_specs(db.shared.level_index1, S.Rank.mega, true);
	const weapons = {
            'w1': Ebw.weapon_mk(ews1),
            'w2': Ebw.weapon_mk(ews2),
	};
	const acc = G.v2d_mk(
	    Eu.level_scale_up(db.shared.level_index1, 0.001, 0.001),
	    Eu.level_scale_up(db.shared.level_index1, 0.0005, 0.001),
	);
	const flight_pattern = new Fp.BuzzPlayer(db, acc, true);
	const spec: Emk.EnemySpec = {
	    fighter_kind: "kamikaze",
            anim: anim,
            rank: S.Rank.small,
            hp_init: K.ENEMY_KAMIKAZE_HP,
            damage: K.ENEMY_KAMIKAZE_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_KAMIKAZE_GEM_COUNT,
	};
	return Emk.warpin_mk_kamikaze(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Kamikaze;

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
                        ...images.lookup_range_n(n => `enemies/kamikaze/kamikaze${n}.png`, 1, 7)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop,
                }
	    )
        });
    });
    return table;
}
