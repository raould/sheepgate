/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as Gr from './ground';
import * as Po from './people';
import * as S from './sprite';
import * as K from './konfig';
import * as A from './animation';
import * as C from './collision';
import * as Tf from './type_flags';
import * as Sh from './fighter_shield';
import * as Rnd from './random';
import * as U from './util/util';
import * as D from './debug';

interface BasePrivate extends S.Base {
    animator: A.ResourceAnimator;
    beam_down_rect: G.Rect;
}

export function base_add(db: GDB.GameDB, ground_kind: Gr.GroundKind) {
    const base = base_mk(db, ground_kind);
    D.assert(base != null);
    if (base != null) {
        db.shared.items.base = base
        add_shield(db, base);
    }
}

function base_mk(db: GDB.GameDB, ground_kind: Gr.GroundKind): U.O<S.Base> {
    let base: U.O<S.Base>;
    let person_size = Po.person_size(ground_kind);
    const ground_tile = pick_base_tile(db);
    if (ground_tile != null) {
        const animator = animator_mk(db, ground_kind);
        const z_back_to_front_ids = animator.z_back_to_front_ids(db);
        // hacky hard coded centeringish of the base in the ground tile, moved up a bit.
        const base_lt = G.v2d_sub(
            G.rect_mt(ground_tile),
            G.v2d_scale_v2d(K.BASE_SIZE, G.v2d_mk(0.5, 0.6))
        );
        const rect = G.rect_mk(base_lt, K.BASE_SIZE);
	const beam_down_center = G.v2d_add(
	    G.rect_mid(rect),
	    G.v2d_mk(0, person_size.y*0.25)
	);
	const beam_down_rect = G.rect_scale_mid_v2d(
	    G.rect_mk(beam_down_center, G.v2d_mk_1()),
	    person_size
	);
        // hacky hard coded centeringish of the person in the base doorway.
        base = GDB.id_mut(
            (dbid: GDB.DBID): S.Base => {
                const s: BasePrivate = {
                    dbid: dbid,
                    comment: "base",
                    vel: G.v2d_mk_0(),
                    acc: G.v2d_mk_0(),
                    lt: rect.lt,
                    size: rect.size,
                    alpha: 1,
                    z_back_to_front_ids: z_back_to_front_ids,
                    animator: animator,
                    beam_down_rect,
                    step(db: GDB.GameDB) {
                        this.z_back_to_front_ids = this.animator.z_back_to_front_ids(db);
                    },
                    get_lifecycle(_:GDB.GameDB) { return GDB.Lifecycle.alive },
                    set_lifecycle(lifecycle: GDB.Lifecycle) {
                        // the base shield is (nigh) invulernable so nothing to do
                    },
                    on_collide(db: GDB.GameDB, dst: S.CollidableSprite): void {},
                    on_death(_:GDB.GameDB) {},
                    toJSON() {
                        return S.spriteJSON(this);
                    }            
                };
                return s as S.Base;
            }
        );
    }
    return base;
}

function animator_mk(db: GDB.GameDB, ground_kind: Gr.GroundKind): A.ResourceAnimator {
    const templater = (() => {
	switch (ground_kind) {
	case Gr.GroundKind.regular: {
	    return (n: number) => `ground/base${n}.png`;
	}
	case Gr.GroundKind.cbm: {
	    return (n: number) => `ground/base_cbm_${n}.png`;
	}
	case Gr.GroundKind.zx: {
	    return (n: number) => `ground/base_zx_${n}.png`;
	}
	}
    })();
    const images = db.uncloned.images;
    return new A.MultiImageAnimator(
        db.shared.sim_now,
        {
            starting_mode: A.MultiImageStartingMode.hold,
            ending_mode: A.MultiImageEndingMode.loop,
            frame_msec: 100,
            resource_ids: [
                ...images.lookup_range_n((n) => templater(n), 1, 4)
            ]
        }
    );
}

function pick_base_tile(db: GDB.GameDB): U.O<G.Rect> {
    let ground = db.shared.items.ground;
    let r: U.O<G.Rect> = undefined;
    for (let i = 0; i < ground.length && r == null; ++i) {
	const g = ground[(i + Math.floor(ground.length/2)) % ground.length];
        // match: people assumes the base must be on a land tile.
        if (g != null && g.ground_type == Gr.GroundType.land) {
            r = g;
        }
    }
    return r;
}

function add_shield(db: GDB.GameDB, base: S.Base) {
    const images = db.uncloned.images;
    GDB.add_sprite_dict_id_mut(
        db.shared.items.shields,
        (dbid: GDB.DBID): S.Shield<S.Base> => {
            const r = G.rect_move(
                G.rect_scale_mid_v2d(base, K.BASE_SHIELD_SCALE),
                G.v2d_mk(0, -30)
            );
            // the base shield is more custom vs. the player & enemy shields.
            // this shield never dies, and also thus does not show an hp bar.
            const s: S.Shield<S.Base> = {
                dbid: dbid,
                get_wrapped(db: GDB.GameDB): U.O<S.Base> {
                    return GDB.get_base(db, base.dbid);
                },
                comment: "base-shield",
                vel: G.v2d_mk_0(),
                acc: G.v2d_mk_0(),
                lt: r.lt,
                size: r.size,
                // the base is not something that can easily
                // be destroyed by anybody. nor is it something
                // that does damage, just because that would
                // get annoying to deal with either as a player
                // or as a the game developer.
                hp_init: Number.MAX_SAFE_INTEGER,
                hp: Number.MAX_SAFE_INTEGER,
                damage: Number.MAX_SAFE_INTEGER, // nullifies enemy shots.
                type_flags: Tf.TF.baseShield,
                ignores: new Map([
                    [C.CMask.enemyShot, C.Reaction.fx],
                ]),
                in_cmask: C.CMask.base,
                from_cmask: C.CMask.enemyShot,
                alpha: K.BASE_SHIELD_ALPHA,
                resource_id: images.lookup("shield/shield1_top.png"),
                step(db: GDB.GameDB) {
                    if (this.anim != null) {
                        if (this.anim.is_alive(db)) {
                            this.anim.step(db);
                            this.alpha = this.anim.alpha;
                        }
                        else {
                            this.anim = undefined;
                            G.rect_set(r, this);
                            this.alpha = K.BASE_SHIELD_ALPHA;
                        }
                    }
                },
                collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>) {
                    // the base shield is (nigh) invulernable so nothing to do
                    // other than kick off the animation.
                    // todo: this should be respecting the 'ignores' field.
                    if (dsts.size > 0) {
                        this.anim = new Sh.ShieldHitAnimation(db, this.dbid);
                    }
                },
                get_lifecycle(_: GDB.GameDB) { return GDB.Lifecycle.alive },
                on_death(_: GDB.GameDB) {},
                toJSON() {
                    return S.spriteJSON(this);
                }
            };
            return s;
        }
    );
}
