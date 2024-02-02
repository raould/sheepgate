import * as GDB from './game_db';
import * as G from './geom';
import * as S from './sprite';
import * as Tf from './type_flags';
import * as C from './collision';
import * as A from './animation';
import * as K from './konfig';
import * as Rnd from './random';
import * as U from './util/util';
import * as D from './debug';

interface GemPrivate extends S.Gem {
    anim: A.ResourceAnimator;
    lifecycle_state: GDB.Lifecycle;
}

export function gems_add(db: GDB.GameDB, around: G.V2D, count: number) {
    if (count < 1) { return; }
    if (count == 1) {
        GDB.add_sprite_dict_id_mut(
            db.shared.items.gems,
            (dbid: GDB.DBID): U.O<S.Gem> => gem_mk(db, dbid, around)
        );
    }
    else {
        const rstart = 2 * Math.PI * Rnd.singleton.next_float_0_1();
        const rstep = 2 * Math.PI / count;
        const radius = G.v2d_abs_max_coord(K.GEM_SIZE);
        for (let i = 0; i < count; ++i) {
            const radians = rstart + i * rstep;
            const ix = around.x + radius * Math.cos(radians);
            const iy = around.y + radius * Math.sin(radians);
            const pos = G.v2d_mk(ix, iy);
            D.log("gems_add", pos);
            GDB.add_sprite_dict_id_mut(
                db.shared.items.gems,
                (dbid: GDB.DBID): U.O<S.Gem> => gem_mk(db, dbid, pos)
            );
        }
    }
}

export function gem_mk(db: GDB.GameDB, dbid: GDB.DBID, lt: G.V2D): S.Gem {
    const images = db.uncloned.images;
    const rids = images.lookup_range_n((n) => `gem/gem${n}.png`, 1, 8);
    const anim: A.ResourceAnimator = A.animator_mk(
        db.shared.sim_now,
        {
            frame_msec: Rnd.singleton.next_float_around(50, 10),
            resource_ids: rids,
            starting_mode: A.MultiImageStartingMode.hold,
            ending_mode: A.MultiImageEndingMode.repeat,
        }
    );
    const g: GemPrivate = {
        dbid: dbid,
        comment: `gem-${dbid}`,
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        lt: lt,
        size: K.GEM_SIZE,
        hp_init: 1,
        hp: 1,
        damage: 0,
        type_flags: Tf.TF.gem,
        in_cmask: C.CMask.gem,
        // todo: gems can be destroyed?
        // todo: gems can be picked up by enemies?
        from_cmask: C.CMask.player, // note: really for player shield. todo: ugh so confusing.
        anim: anim,
        z_back_to_front_ids: anim.z_back_to_front_ids(db),
        alpha: 1,
        lifecycle_state: GDB.Lifecycle.alive,
        step(db: GDB.GameDB) {
            this.z_back_to_front_ids = this.anim.z_back_to_front_ids(db);
        },
        get_lifecycle(_:GDB.GameDB) {
            return this.lifecycle_state;
        },
        collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>) {
            this.lifecycle_state = GDB.Lifecycle.reap;
        },
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    };
    return g;
}
