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
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(8, 8), 3));
const WARPIN_RESOURCE_ID = "enemies/munchies/mr.png";
const Munchie: Lemk.EnemyMk = {
    SIZE,
    WARPIN_RESOURCE_ID,
    warpin_mk: (db: GDB.GameDB): U.O<S.Warpin> => {
	const anim = new A.AnimatorDimensions(anims_spec_mk(db));
	// todo: fix up all this weapon stuff, everywhere, just shoot me.
	// 1 weapon that swivels so there's only one clip to avoid too many shots. :-(
	const [ews] = Ebw.scale_specs(db.shared.level_index1, S.Rank.small, true);
	const weapons = {
            'w': Ebw.weapon_mk(ews),
	};
	const flight_pattern = new Fp.BuzzPlayer(db, G.v2d_mk(0.001, 0.0003));
	const spec: Emk.EnemySpec = {
            anim: anim,
            rank: S.Rank.basic,
            hp_init: K.ENEMY_MUNCHIE_HP,
            damage: K.ENEMY_MUNCHIE_DAMAGE,
            weapons: weapons,
            flight_pattern: flight_pattern,
            gem_count: K.ENEMY_MUNCHIE_GEM_COUNT,
	};
	return Emk.warpin_mk_munchie(
            db,
            SIZE,
    	    WARPIN_RESOURCE_ID,
	    spec,
	);
    }
}
export default Munchie;

function f2s(f: F.Facing): string {
    return F.on_facing(f, "l", "r");
}

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
        // enemy doesn't show any thrusters.
        ...t2a_still_facing_mk(db, true, F.Facing.left),
        ...t2a_still_facing_mk(db, true, F.Facing.right),
        ...t2a_still_facing_mk(db, false, F.Facing.left),
        ...t2a_still_facing_mk(db, false, F.Facing.right),
    ];
    return A.dimension_spec_mk(db, frames);
}

const tspecs: Array<[number, string]> = [[1,""]];
function t2a_still_facing_mk(db: GDB.GameDB, thrusting: boolean, facing: F.Facing): A.DimensionsFrame[] {
    const table: A.DimensionsFrame[] = [];
    const images = db.uncloned.images;
    const fstr = f2s(facing);
    tspecs.forEach(spec => {
        const [t, _] = spec;
        table.push({
            facing,
            thrusting,
            t,
            animator: A.animator_mk(
                db.shared.sim_now,
                {
		    resource_id: images.lookup(`enemies/munchies/m${fstr}.png`)
		}
            )
        });
    });
    return table;
}
