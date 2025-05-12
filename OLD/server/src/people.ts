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
import * as K from './konfig';

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
    const grounds = U.shuffle_array(gs, rnd)
          .filter(g => g.ground_type == Gr.GroundType.land)
          .filter(g => !G.rects_are_overlapping(base, g));
    let population_count = 0;
    while (cluster_count > 0 && population_count < K.PEOPLE_MAX_COUNT) {
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
    // [todo: do we even have lava any more?]
    // (keeping away from the edges that might have a little sea/lava.
    // todo: ideally we'd check the type of the tile and then adjust
    // for more or less room, but ha ha, whatever! we don't have
    // lavs/sea enabled now anyway.)
    // also this is hacky crap to allow room for (max 3) people in a row.
    const mt = G.rect_mt(g);
    const fudge_range = g.size.x * 0.4;
    const ov = G.v2d_mk(fudge_range, 0);
    const dst = rnd.v2d_around(mt, ov);
    // match: konfig.ts, currently hardcoded to have 2 people per cluster.
    add_person(db, dst, 0, rnd);
    add_person(db, dst, rnd.float_range(-fudge_range, -fudge_range/2), rnd);
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
        (dbid: GDB.DBID): S.Person => waiting_mk(db, dbid, lt)
    );
}

function waiting_mk(db: GDB.GameDB, dbid: GDB.DBID, lt: G.V2D): S.Person {
    const standing_anim = standing_anim_mk(db);
    const waving_anim = waving_anim_mk(db);
    const s: PersonPrivate = {
        dbid: dbid,
        comment: `person-${dbid}`,
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        lt: lt,
        size: K.PEOPLE_SIZE,
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
            this.lifecycle_state = GDB.Lifecycle.reap;
            GDB.add_sprite_dict_id_mut(
                db.shared.items.fx,
                (dbid: GDB.DBID): S.Sprite => beaming_up_anim_mk(db, dbid, this)
            );
            db.shared.items.sfx.push({ sfx_id: K.BEAMUP_SFX });
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

function standing_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const images = db.uncloned.images;
    const spec: A.SingleImageSpec = {
        resource_id: images.lookup("people/standing.png"),
    };
    return new A.SingleImageAnimator(db.shared.sim_now, spec);
}

function waving_anim_mk(db: GDB.GameDB): A.ResourceAnimator {
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

function beaming_up_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, src: S.Person): S.Sprite {
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

export function beaming_down_anim_mk(db: GDB.GameDB, dbid: GDB.DBID, rect: G.Rect, on_end: GDB.Callback): S.Sprite {
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
