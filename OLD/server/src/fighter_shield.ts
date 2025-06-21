/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as S from './sprite';
import * as GDB from './game_db';
import * as G from './geom';
import * as C from './collision';
import * as Tf from './type_flags';
import * as K from './konfig';
import * as Dr from './drawing';
import * as Exi from './explosionImg';
import * as Exx from './explosionX';
import * as Pr from './particles';
import * as U from './util/util';
import * as D from './debug';

// note: only shields interact with weapons,
// so everything destructible has to have a shield.
// however, one-shot enemies should not show it.

// a shield has as much hp as the sprite it wraps.
// it is more about making collision detection easy
// using ellipses than anything "realistic"!

export interface ShieldWrappingSpec extends C.Masked, C.Ignores {
    resource_id: string;
    enlarge: G.V2D;
    fighter: S.Fighter;
    comment: string;
    hp_init: number;
    damage: number;
    alpha?: number;
    on_collide?(thiz: S.Shield<S.Fighter>, db: GDB.GameDB, sprite: S.CollidableSprite, reaction: C.Reaction): void;
}

interface ShieldPrivate extends S.Shield<S.Fighter> {
    visible: boolean;
    wrapped_dbid: GDB.DBID;
    pull_rect(db: GDB.GameDB): void;
    step_anim(db: GDB.GameDB): void;
    step_bar(db: GDB.GameDB): void;
    collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>): void;
    on_collide(db: GDB.GameDB, sprite: S.CollidableSprite): void;
}

export function add_fighter_shield(db: GDB.GameDB, spec: ShieldWrappingSpec) {
    const shields = db.shared.items.shields;
    const visible = spec.hp_init > K.PLAYER_SHOT_DAMAGE; // 'basic' enemies.
    GDB.add_sprite_dict_id_mut(
        shields,
        (dbid): S.Shield<S.Fighter> => {
	    const fighter = GDB.get_fighter(db, spec.fighter.dbid);
	    if (U.exists(fighter)) {
		fighter.shield_id = dbid;
	    }
            const s: ShieldPrivate = {
                dbid: dbid,
		wrapped_dbid: spec.fighter.dbid,
                get_wrapped(db: GDB.GameDB): U.O<S.Fighter> {
                    return GDB.get_fighter(db, this.wrapped_dbid);
                },
                comment: `${spec.comment}/${spec.fighter.comment}`,
                ...G.rect_clone(spec.fighter),
		visible,
                vel: G.v2d_mk_0(),
                acc: G.v2d_mk_0(),
                ignores: spec.ignores,
                hp_init: spec.hp_init,
                hp: spec.hp_init,
                damage: spec.damage,
                // todo: i wish i knew a better way to do all this 'typing'.
                type_flags: Tf.firstMatch(spec.fighter.type_flags, [Tf.TF.player, Tf.TF.enemy]) | Tf.TF.shield,
                in_cmask: spec.in_cmask,
                from_cmask: spec.from_cmask,
                resource_id: spec.resource_id,
		// match: client
                alpha: !visible ? Number.MIN_VALUE : (spec.alpha ?? K.SHIELD_ALPHA), // shield will flare up when hit.
                pull_rect(db: GDB.GameDB) {
                    U.if_let_safe(
                        this.get_wrapped(db),
                        (f: S.Fighter) => {
                            let r = G.rect_scale_mid_v2d(f, spec.enlarge);
                            G.rect_set(r, this);
                            G.rect_wrapH_mut(this, db.shared.world.bounds0);
                        },
                        () => {
                            D.assert_fail("shield lost the wrapped fighter");
                            this.hp = 0; // force reaping.
                        }
                    );
                },
                step(db: GDB.GameDB) {
                    this.pull_rect(db);
                    const t = U.clip01(this.hp / this.hp_init);
		    // match: client
                    this.alpha = !this.visible ? Number.MIN_VALUE : (spec.alpha ?? K.SHIELD_ALPHA * (0.1 + t));
                    this.step_anim(db);
                    this.step_bar(db);
                },
                step_anim(db: GDB.GameDB) {
                    if (this.visible && U.exists(this.anim)) {
                        if (this.anim.is_alive(db)) {
                            this.anim.step(db);
                            this.alpha = this.anim.alpha;
                        }
                        else {
                            this.anim = undefined;
                        }
                    }
                },
                step_bar(db: GDB.GameDB) {
                    if (this.visible) {
                        // todo: optimize this.
                        // todo: abstract this.
                        // todo: make this more usable overall, and for folks with *chromacy.
                        const t = U.clip01(this.hp / this.hp_init);
                        const full0 = G.rect_mk(G.v2d_mk_0(), G.v2d_mk(K.SHIELD_BAR_WIDTH, K.SHIELD_BAR_HEIGHT));
                        const full_mid = G.v2d_sub(G.rect_mid(this), G.v2d_mk(0, G.rect_h(this) / 2 + K.SHIELD_BAR_OFFSET_Y));
                        const full = G.rect_set_mid(full0, full_mid);
                        // draw green on top so that as it reduces the red is revealed.
                        this.drawing = Dr.drawing_mk();
                        this.drawing.rects.push({
                            wrap: true,
                            line_width: 0,
                            color: K.SHIELD_DAMAGE_COLOR,
                            is_filled: true,
                            rect: full
                        });
                        const remaining0 = G.rect_scale_v2d(full, G.v2d_mk(t, 1));
                        const remaining = G.rect_set_lt(remaining0, full.lt);
                        this.drawing.rects.push({
                            wrap: true,
                            line_width: 0,
                            color: K.SHIELD_HP_COLOR,
                            is_filled: true,
                            rect: remaining
                        });
                    }
                },
                collide(db: GDB.GameDB, dsts: Set<S.CollidableSprite>) {
                    dsts.forEach(dst => {
                        this.on_collide(db, dst);
                    });
                },
                on_collide(db: GDB.GameDB, sprite: S.CollidableSprite) {
                    const reaction = C.ignores_test(this, sprite);
                    // note: the player has an extra hard-coded ability to crash through enemies somewhat.
                    U.if_let(spec.on_collide, c => c(this, db, sprite, reaction));
                    U.if_let(this.get_wrapped(db), w => w.on_collide(db, sprite));
                    switch (reaction) {
                    case C.Reaction.ignore: {
                        break;
		    }
                    case C.Reaction.fx: {
                        this.anim = new ShieldHitAnimation(db, this.dbid);
                        break;
		    }
                    case C.Reaction.hp: {
                        this.anim = new ShieldHitAnimation(db, this.dbid);
			db.shared.sfx.push({ sfx_id: K.EXPLOSION_SFX, gain: 0.4 });
                        this.hp -= sprite.damage;
                        GDB.add_dict_id_mut(
                            db.shared.items.particles,
                            (dbid: GDB.DBID) => new Pr.ParticleEllipseGenerator(
                                dbid,
                                K.SHIELD_HIT_PARTICLE_DURATION_MSEC,
                                this,
                                K.SHIELD_HIT_PARTICLE_COUNT,
                                K.SHIELD_HIT_PARTICLE_SPEED,
                            )
                        );                        
                        break;
		    }
                    }
                },
                get_lifecycle(_: GDB.GameDB): GDB.Lifecycle {
                    return this.hp > 0 ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
                },
                on_death(db: GDB.GameDB) {
                    U.if_let(
                        this.get_wrapped(db),
                        fighter => {
                            on_death_fx(db, this, fighter);
                            fighter.set_lifecycle(GDB.Lifecycle.dead);
                        }
                    );
                },
                toJSON() {
                    return S.spriteJSON(this);
                }
            }
            return s as S.Shield<S.Fighter>;
        });
}

function on_death_fx(db: GDB.GameDB, shield: ShieldPrivate, fighter: S.Fighter) {
    db.shared.sfx.push({ sfx_id: K.EXPBOOM_SFX, gain: 3 });
    const exids: GDB.DBID[] = [];
    const xs = fighter.rank == S.Rank.hypermega ? 1.2 : 0.5;
    const r = G.rect_circle_outside(G.rect_scale_mid_v2d(shield as G.Rect, G.v2d_mk_nn(xs)));
    const type_flags = Tf.firstMatch(fighter.type_flags, [Tf.TF.player, Tf.TF.enemy]) | Tf.TF.explosion;
    GDB.add_sprite_dict_id_mut(
        db.shared.items.explosions,
        (dbid: GDB.DBID): S.Explosion => {
            exids.push(dbid);
            return Exi.explosionImg_mk(db, {
                dbid: dbid,
                comment: `explosionImg-${dbid}`,
                ...r,
                type_flags: type_flags,
                rank: fighter.rank,
                vel: G.v2d_mk_0(),
                acc: G.v2d_mk_0(),
                alpha: 1,
            })
        }
    );
    GDB.add_dict_id_mut(
        db.shared.items.particles,
        (dbid: GDB.DBID) => new Pr.ParticleEightGenerator(
            dbid,
            K.EXPLOSION_PARTICLE_DURATION_MSEC,
	    G.rect_scale_mid(r, 0.5),
            K.EXPLOSION_PARTICLE_COUNT,
            K.EXPLOSION_PARTICLE_SPEED,
        )
    );
    if (fighter.rank >= S.Rank.hypermega || fighter.rank == S.Rank.player) {
        GDB.add_sprite_dict_id_mut(
            db.shared.items.explosions,
            (dbid: GDB.DBID): S.Explosion => {
                exids.push(dbid);
                return Exx.explosionX_mk(db, {
                    dbid: dbid,
                    comment: `explosionX-${dbid}`,
                    ...r,
                    type_flags: type_flags,
                    rank: fighter.rank,
                    vel: G.v2d_mk_0(),
                    acc: G.v2d_mk_0(),
                    alpha: 1,
                })
            }
        );
    }
}

export class ShieldHitAnimation {
    private shield_id: GDB.DBID;
    private start_msec: number;
    private shield_size: U.O<G.V2D>;
    private duration_msec: number;
    public alpha: number;

    constructor(db: GDB.GameDB, shield_id: GDB.DBID) {
        this.shield_id = shield_id;
        this.start_msec = db.shared.sim_now;
        this.duration_msec = K.SHIELD_HIT_ANIM_MSEC;
        this.alpha = 1;
        U.if_let(
            this.get_shield(db),
            shield => this.shield_size = G.v2d_clone(shield.size)
        );
        this.step(db);
    }

    get_shield(db: GDB.GameDB): U.O<S.HpSprite> {
        return GDB.get_shield(db, this.shield_id);
    }

    is_alive(db: GDB.GameDB): boolean {
        const shield = this.get_shield(db);
        const alive = U.exists(shield) && shield.hp > 0;
        const dt = db.shared.sim_now - this.start_msec;
        const running = dt < this.duration_msec;
        return alive && running;
    }

    step(db: GDB.GameDB) {
        const shield = this.get_shield(db);
        if (U.exists(shield) && U.exists(this.shield_size)) {
            const now = db.shared.sim_now;
            const max_flare = U.clip01(shield.hp / shield.hp_init + 0.1);
            const flare = max_flare * U.t10(this.start_msec, this.start_msec + this.duration_msec, now);
            this.alpha = Math.max(K.SHIELD_ALPHA, flare);
        }
    }
}
