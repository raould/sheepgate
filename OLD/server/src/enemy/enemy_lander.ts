/* Copyright (C) 2026-2026 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
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

/*
  (1) pick a free victim.
  (*) flight pattern.
  (6) if reaching the top, mutate.
  (*) enemy must de-register if destroyed.
*/

// match: sprite animation.
const SIZE = K.vd2s(G.v2d_scale_i(G.v2d_mk(16, 16), 2));
const WARPIN_RESOURCE_ID = "enemies/lander/lander0.png";
const Lander: Lemk.EnemyMk = {
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
	const acc = G.v2d_mk(
	    Eu.level_scale_up(db.shared.level_index1, 0.0002, 0.0002),
	    Eu.level_scale_up(db.shared.level_index1, 0.0005, 0.001),
	);
	const vid = GDB.pick_victim(db);
	// todo: register it with the dbid that this enemy eventually gets. :-(
	const flight_pattern = new LanderPattern(db, vid);
	const spec: Emk.EnemySpec = {
	    fighter_kind: "lander",
            anim,
            rank: S.Rank.small,
            hp_init: K.ENEMY_LANDER_HP,
            damage: K.ENEMY_LANDER_DAMAGE,
            weapons,
            flight_pattern,
            gem_count: K.ENEMY_LANDER_GEM_COUNT,
	    on_death: (db: GDB.GameDB) => {
		if (U.exists(vid)) {
		    db.shared.items.victims.deleteB(vid);
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
export default Lander;

function anims_spec_mk(db: GDB.GameDB): A.AnimatorDimensionsSpec {
    const frames: A.DimensionsFrame[] = [
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
                A.defaultAlphasSpec({
		    frame_msec: 40,
		    resource_ids: [
                        ...images.lookup_range_n(n => `enemies/lander/lander${n}.png`, 0, 3)
		    ],
		    starting_mode: A.MultiImageStartingMode.hold,
		    ending_mode: A.MultiImageEndingMode.loop,
                })
	    )
        });
    });
    return table;
}

class LanderPattern implements Fp.FlightPattern {
    private pattern: Fp.FlightPatternDone;

    constructor(db: GDB.GameDB, private vid: U.O<GDB.DBID>) {
	this.pattern = new PatrolPattern(db);
    }

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	this.update_pattern(db, src);
	return this.pattern.step_delta_acc(db, src);
    }

    /*
      (0) if no victim, just some standard patrol.
      - if the victim was rescued.
      - if the victim was destroyed.
      (1) move horizontally to their x position.
      (2) descend y to just above them.
      (3) pick them up.
      (4) ascend with them in y.
      // good thing the People can't move around.
    */
    update_pattern(db: GDB.GameDB, src: S.Enemy) {
	if (U.isU(this.vid) || (!(this.vid in db.shared.items.people))) {
	    if (!(this.pattern instanceof PatrolPattern)) {
		this.pattern = new PatrolPattern(db);
	    }
	}
	else {
	    if (this.pattern instanceof PatrolPattern) {
		this.pattern = new HorizontalPattern(this.vid);
	    }
	}
    }
}

class PatrolPattern implements Fp.FlightPatternDone {
    is_done: boolean = false;
    flight_pattern: Fp.DescendAndGoSine;

    constructor(db: GDB.GameDB) {
	this.flight_pattern = new Fp.DescendAndGoSine(
	    db,
	    SIZE,
	    Rnd.singleton.v2d_around(
		G.v2d_mk_nn(Eu.level_scale_up(db.shared.level_index1, 0.0008, 0.001)),
		G.v2d_mk_nn(Eu.level_scale_up(db.shared.level_index1, 0.0001, 0.0005))
	    ),
	    { y: db.shared.world.gameport.world_bounds.size.y * 0.3 }
	);
    }

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	return this.flight_pattern.step_delta_acc(db, src);
    }
}

class HorizontalPattern implements Fp.FlightPatternDone {
    is_done: boolean = false;
    acc_mag: G.V2D = G.v2d_mk_x(0.001);

    constructor(private vid: U.O<GDB.DBID>) {}

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	const v = GDB.get_person(db, this.vid);
	if (U.exists(v)) {
            const delta_acc = Fp.calculate_acc(
		G.rect_mid(src),
		G.rect_mid(Fp.rect_in_bounds_y(db, v)),
		this.acc_mag,
		db.local.frame_dt
	    );
	    return G.v2d_x0(delta_acc);
	}
	else {
	    return G.v2d_mk_0();
	}
    }
}

class DownPattern implements Fp.FlightPatternDone {
    is_done: boolean = false;
    constructor(private vid: U.O<GDB.DBID>) {}
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	return G.v2d_mk_0();
    }
}

class CapturingPattern implements Fp.FlightPatternDone {
    is_done: boolean = false;
    constructor(private vid: U.O<GDB.DBID>) {}
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	return G.v2d_mk_0();
    }
}

class UpPattern implements Fp.FlightPatternDone {
    is_done: boolean = false;
    constructor(private vid: U.O<GDB.DBID>) {}
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	return G.v2d_mk_0();
    }
}
