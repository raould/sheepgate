/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as S from './sprite';
import * as GDB from './game_db';
import * as Ph from './phys';
import * as G from './geom';
import * as C from './collision';
import * as D from './debug';
import * as Tf from './type_flags';
import * as U from './util/util';
import * as A from './animation';
import * as Gr from './ground';

// todo: the *Spec things are all horribly evil bad nasty inconsistent code. i really don't know what to do.
export interface ShotSpec extends U.FieldsOnly<GDB.Item>, S.Damage, C.Masked {
    lt: G.V2D;
    size: G.V2D;
    vel: G.V2D;
    alpha: number;
    life_msec: number;
    anim: A.FacingResourceAnimator;
    step?: (db: GDB.GameDB, dbid: GDB.DBID) => void;
}

interface ShotPrivate extends S.Shot {
    step_pos(db: GDB.GameDB): void;
    step_anim(db: GDB.GameDB): void;
}

export function shot_mk(db: GDB.GameDB, src: S.Fighter, spec: ShotSpec): U.O<S.Shot> {
    return GDB.add_sprite_dict_id_mut(
        db.shared.items.shots,
        (dbid: GDB.DBID): U.O<ShotPrivate> => ({
            ...spec,
            z_ids: spec.anim.z_ids(db, src.facing),
            dbid: dbid,
            facing: src.facing,
            lt: spec.lt,
            acc: G.v2d_mk_0(),
            hp_init: 1,
            hp: 1,
            type_flags: Tf.firstMatch(src.type_flags, [Tf.TF.player, Tf.TF.enemy]) | Tf.TF.shot,
            in_cmask: spec.in_cmask,
            from_cmask: spec.from_cmask,        
            alpha: 1,
            step(db: GDB.GameDB) {
                this.step_pos(db);
                this.step_anim(db);
                spec.step?.(db, dbid);
            },
            step_pos(db: GDB.GameDB) {
                const dt = db.local.frame_dt;
                this.life_msec -= dt;
                Ph.p2d_step_mut(this, dt);
                this.lt = G.v2d_wrapH(this.lt, db.shared.world.bounds0);
                const maxy = Gr.p2d_max_ys(db, this);
                if (maxy < this.lt.y) {
                    this.hp = 0;
                }
            },
            step_anim(db: GDB.GameDB) {
                this.z_ids = spec.anim.z_ids(db, this.facing);
            },
            collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>) {
		console.log("shot.collide?");
		this.hp = 0;
		this.damage = 0;
            },
            get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
                // todo: it would be nice not to have this hardcoded player's shot special case here!
                // player shots shouldn't be exploding things that are off screen, i feel,
                // vs. enemy shots shouldn't get clipped as soon as they go offscreen
                // eg if the player zooms past then turns around, the enemy shots should
                // still be there.
                if (U.has_bits(this.in_cmask, C.CMask.playerShot) &&
                    !G.rects_are_overlapping_wrapH(this, db.shared.world.gameport.world_bounds, db.shared.world.bounds0)) {
                    return GDB.Lifecycle.dead;
                }
		// clip shots when they hit the ground.
                if (G.rect_mid(this).y > db.shared.world.ground_y) {
                    return GDB.Lifecycle.dead;
                }
                if (this.life_msec <= 0) {
                    return GDB.Lifecycle.dead;
                }
                if (this.hp <= 0) {
                    this.damage = 0;
                    // todo: something architecturally better than this
                    // hack allowing the shot to appear for at least 1 frame.
                    return this.life_msec == spec.life_msec ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
                }
                return GDB.Lifecycle.alive;
            },
            on_death(_: GDB.GameDB) {},
            toJSON() {
                return S.spriteJSON(this);
            }
        })
    );
}
