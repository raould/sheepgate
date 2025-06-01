/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as S from './sprite';
import * as G from './geom';
import * as Gr from './ground';
import * as C from './collision';
import * as Tf from './type_flags';
import * as Rnd from './random';
import * as D from './debug';
import * as A from './animation';
import * as U from './util/util';
import * as Ur from './util/util_rnd';
import * as K from './konfig';

// note: K.PEOPLE_MAX_COUNT is enforced below (hopefully)
// so the scaling up across level progression doesn't too crazy.

/* make some clusters of people around the world,
   on safe ground, that then have to be able to 
   be picked up by the player, and then have
   to be able to be deposited at a home base
   in dropzone/choplifter style.
*/

export function populate(db: GDB.GameDB, cluster_count: number) {
    if (db.shared.level_index1 == 1) {
        populate_next_to_base(db, cluster_count);
    }
    else {
        populate_random(db, cluster_count);
    }
}

function populate_next_to_base(db: GDB.GameDB, cluster_count: number) {
    const rnd = new Rnd.RandomImpl(db.shared.level_index1); // some per-level determinism.
    const gs = db.shared.items.ground;
    const base = db.shared.items.base;
    D.assert(!!base);
    D.assert(cluster_count <= db.shared.items.ground.length);
    // match: base must only be on land tiles.
    // put them close but not too close to the base.
    const index = gs.findIndex(g => G.rects_are_overlapping(base, g)) + 2;
    D.assert(index >= 0);
    let remaining = cluster_count;
    while (remaining > 0) {
        const g = U.element_looped(gs, index);
        if (g?.ground_type == Gr.GroundType.land) {
            add_people_cluster(db, g, rnd);
            remaining--;
        }
    }   
}

function populate_random(db: GDB.GameDB, cluster_count: number) {
    const rnd = new Rnd.RandomImpl(db.shared.level_index1); // some per-level determinism.
    const gs = db.shared.items.ground;
    const base = db.shared.items.base;
    const index = gs.findIndex(g => G.rects_are_overlapping(base, g)) + 2;
    D.assert(!!base);
    D.assert(index >= 0);
    D.assert(cluster_count <= gs.length);
    const grounds = Ur.shuffle_array(gs, rnd)
          .filter(g => g.ground_type == Gr.GroundType.land)
          .filter(g => !G.rects_are_overlapping(base, g));
    let population_count = 0;
    while (cluster_count > 0) {
        const g = rnd.array_item(grounds);
        if (g != null && g.ground_type == Gr.GroundType.land) {
	    // just not right next to the base, please.
	    const dx = Math.abs(G.rect_l(g) - G.rect_l(base));
	    // yes, the *2 below assumes there are enough tiles.
	    const ok = dx > K.GROUND_SIZE.x * 2;
	    D.log(dx, ok);
	    if (ok) {
		const d = Math.abs(base.lt.x - g.lt.x)
		const f = U.clip(U.t10(0, db.shared.world.bounds0.x/2, d), 0.01, 1);
		const populate = rnd.boolean(f);
		if (populate) {
		    population_count += add_people_cluster(db, g, rnd);
		    cluster_count--;
		}
	    }
        }
    }
}

function add_people_cluster(db: GDB.GameDB, g: Gr.Ground, rnd: Rnd.Random): number {
    // [todo: do we even have lava any more? ... no]
    // (keeping away from the edges that might have a little sea/lava.
    // todo: ideally we'd check the type of the tile and then adjust
    // for more or less room, but ha ha, whatever! we don't have
    // lavs/sea enabled now anyway.)
    // also this is hacky crap to allow room for (max 3) people in a row.
    const mt = G.rect_mt(g);
    const fudge_range = g.size.x * 0.4;
    const ov = G.v2d_mk(fudge_range, 0);
    const dst = rnd.v2d_around(mt, ov);
    // 2:1 ratio, match: K.CLUSTER_MAX_COUNT assumes 3 per cluster.
    add_person(db, dst, 0, rnd);
    add_sheep(db, dst, rnd.float_range(-fudge_range, -fudge_range/2), rnd);
    add_sheep(db, dst, rnd.float_range(fudge_range, fudge_range/2), rnd);
    return 2;
}

interface PersonPrivate extends S.Person {
    lifecycle_state: GDB.Lifecycle;
    anim: A.ResourceAnimator;
}

function add_person(db: GDB.GameDB, mb: G.V2D, off_x: number, rnd: Rnd.Random) {
    const offset_x = G.v2d_mk(off_x, rnd.float_range(-2, 2));
    const lt = G.v2d_sub(
        G.v2d_add(mb, offset_x),
        // hard coded hack to look good. todo: ground should have hidden hotspots instead.
        G.v2d_mk(K.PEOPLE_SIZE.x / 2, K.PEOPLE_SIZE.x * 0.75)
    );
    // todo: note: the whole beaming/rescue thing has a lot of state transitions
    // which means it has a lot of code which means it gets confusing and buggy.
    // i am trying to split out the stages into their own instances so that
    // each one has more of a single responsibility vs. encoding all the stages
    // in one instance. however, ascii duplication cannot be entirely avoided.
    GDB.add_sprite_dict_id_mut(
        db.shared.items.people,
        (dbid: GDB.DBID): S.Person => waiting_mk(
	    db, dbid, lt, K.PEOPLE_SIZE,
	    person_standing_anim_mk(db),
	    person_waving_anim_mk(db),
	    person_beam_up_anim_mk,
	    person_beam_down_anim_mk
	)
    );
}

function add_sheep(db: GDB.GameDB, mb: G.V2D, off_x: number, rnd: Rnd.Random) {
    const offset_x = G.v2d_mk(off_x, rnd.float_range(-2, 2));
    const lt = G.v2d_sub(
        G.v2d_add(mb, offset_x),
        // hard coded hack to look good. todo: ground should have hidden hotspots instead.
        G.v2d_mk(K.SHEEP_SIZE.x / 2, K.SHEEP_SIZE.y * 0.6)
    );
    // todo: sheep beam up vs. down animations, too.
    GDB.add_sprite_dict_id_mut(
        db.shared.items.people,
        (dbid: GDB.DBID): S.Person => waiting_mk(
	    db, dbid, lt, K.SHEEP_SIZE,
	    sheep_standing_anim_mk(db),
	    sheep_waving_anim_mk(db),
	    sheep_beam_up_anim_mk,
	    sheep_beam_down_anim_mk
	)
    );
}

function waiting_mk(
    db: GDB.GameDB,
    dbid: GDB.DBID,
    lt: G.V2D,
    size: G.V2D,
    standing_anim: A.ResourceAnimator,
    waving_anim: A.ResourceAnimator,
    beam_up_anim_mk: (db: GDB.GameDB, dbid: GDB.DBID, src: S.Person) => S.Sprite,
    beam_down_anim_mk: (db: GDB.GameDB, dbid: GDB.DBID, rect: G.Rect, on_end: GDB.Callback) => S.Sprite,
): S.Person {
    const s: PersonPrivate = {
        dbid: dbid,
        comment: `person-${dbid}`,
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        lt: lt,
        size,
        hp_init: 1,
        hp: 1,
        damage: 0,
        type_flags: Tf.TF.person,
        in_cmask: C.CMask.people,
        // todo: some day can people be shot?
        from_cmask: C.CMask.none,
        alpha: 1,
        anim: standing_anim,
        lifecycle_state: GDB.Lifecycle.alive,
        step(db: GDB.GameDB) {
            U.if_let(
                GDB.get_player(db),
                (player: S.Player) => {
                    const d = Math.pow(player.lt.x - this.lt.x, 2);
                    this.anim = d < (200**2) ? waving_anim : standing_anim;
                }
            );
            this.z_back_to_front_ids = this.anim.z_back_to_front_ids(db);
        },
        collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>) {
            // todo: some day can people be shot?
            D.assert(false, "wtf");
        },
        beam_up(db: GDB.GameDB) {
	    GDB.reap_item(db.shared.items.people, this as S.Person); // 'as' "ugh"!
	    GDB.add_item(db.shared.items.beaming_buffer, this);
            GDB.add_sprite_dict_id_mut(
                db.shared.items.fx,
                (dbid: GDB.DBID): S.Sprite => beam_up_anim_mk(db, dbid, this)
            );
            db.shared.sfx.push({ sfx_id: K.BEAMUP_SFX, gain: 0.35 });
        },
	beam_down(db: GDB.GameDB, down_rect: G.Rect, on_end: (db: GDB.GameDB) => void) {
	    this.lifecycle_state = GDB.Lifecycle.dead;
	    db.shared.sfx.push({ sfx_id: K.BEAMDOWN_SFX, gain: 0.35 });
            const s = GDB.add_sprite_dict_id_mut(
                db.shared.items.fx,
                (dbid: GDB.DBID): S.Sprite => beam_down_anim_mk(
                    db,
                    dbid,
		    down_rect,
		    on_end,
		)
	    );
	},
        get_lifecycle(_:GDB.GameDB) {
            return this.lifecycle_state;
        },
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    };
    return s as S.Person;
}

function person_standing_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const images = db.uncloned.images;
    const spec: A.SingleImageSpec = {
        resource_id: images.lookup("people/standing.png"),
    };
    return new A.SingleImageAnimator(db.shared.sim_now, spec);
}

function person_waving_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const images = db.uncloned.images;
    const spec: A.MultiImageSpec = {
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.loop,
        offset_msec: Rnd.singleton.float_range(0, 250),
        frame_msec: Rnd.singleton.float_around(200, 50),
        resource_ids: images.lookup_range_n((n) => `people/waving${n}.png`, 1, 2)
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    return anim;
}

function sheep_standing_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const images = db.uncloned.images;
    const spec: A.SingleImageSpec = {
        resource_id: images.lookup("people/sheep1.png"),
    };
    return new A.SingleImageAnimator(db.shared.sim_now, spec);
}

function sheep_waving_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const images = db.uncloned.images;
    const spec: A.MultiImageSpec = {
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.loop,
        offset_msec: Rnd.singleton.float_range(0, 250),
        frame_msec: Rnd.singleton.float_around(100, 25),
        resource_ids: images.lookup_range_n((n) => `people/sheep${n}.png`, 1, 4)
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    return anim;
}

function person_beam_up_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, src: S.Person): S.Sprite {
    // there's a lot of hard-coded twiddling of values in here to make it look less bad, sorry.
    const images = db.uncloned.images;
    const resources = images.lookup_range_n((n) => `people/tp${n}.png`, 0, 5);
    const spec: A.MultiImageSpec = {
        offset_msec: Rnd.singleton.float_range(0, 250),
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.hide,
        frame_msec: K.TELEPORT_ANIM_FRAME_MSEC,
        resource_ids: resources
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    const sprite = A.anim_sprite_mk(db, anim, src);
    return {
        ...sprite,
        comment: `person-up-${dbid}`,
        dbid: dbid
    };
}

export function person_beam_down_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, rect: G.Rect, on_end: GDB.Callback): S.Sprite {
    const images = db.uncloned.images;
    const resources = images.lookup_range_n((n) => `people/tp${n}.png`, 5, 0);
    const spec: A.MultiImageSpec = {
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.hide,
        frame_msec: K.TELEPORT_ANIM_FRAME_MSEC,
        resource_ids: resources
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    const events = new A.ResourceAnimatorEvents(anim, {on_end: on_end});
    const sprite = A.anim_sprite_mk(db, events, rect);
    return {
        ...sprite,
        comment: `person-down-${dbid}`,
        dbid: dbid
    };
}

function sheep_beam_up_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, src: S.Person): S.Sprite {
    // there's a lot of hard-coded twiddling of values in here to make it look less bad, sorry.
    const images = db.uncloned.images;
    const resources = images.lookup_range_n((n) => `people/sheepT${n}.png`, 1, 10);
    const spec: A.MultiImageSpec = {
        offset_msec: Rnd.singleton.float_range(0, 250),
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.hide,
        frame_msec: K.TELEPORT_ANIM_FRAME_MSEC,
        resource_ids: resources
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    const sprite = A.anim_sprite_mk(db, anim, src);
    return {
        ...sprite,
        comment: `sheep-up-${dbid}`,
        dbid: dbid
    };
}

export function sheep_beam_down_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, rect: G.Rect, on_end: GDB.Callback): S.Sprite {
    const images = db.uncloned.images;
    const resources = images.lookup_range_n((n) => `people/sheepT${n}.png`, 5, 1);
    const spec: A.MultiImageSpec = {
        starting_mode: A.MultiImageStartingMode.hold,
        ending_mode: A.MultiImageEndingMode.hide,
        frame_msec: K.TELEPORT_ANIM_FRAME_MSEC,
        resource_ids: resources
    };
    const anim = new A.MultiImageAnimator(db.shared.sim_now, spec);
    const events = new A.ResourceAnimatorEvents(anim, {on_end: on_end});
    const sprite = A.anim_sprite_mk(db, events, rect);
    return {
        ...sprite,
        comment: `sheep-down-${dbid}`,
        dbid: dbid
    };
}
