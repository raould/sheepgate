/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as C from '../collision';
import * as Sh from '../fighter_shield';
import * as Rnd from '../random';
import * as Sc from '../scoring';
import * as A from '../animation';
import * as Tkg from '../ticking_generator';
import * as F from '../facing';
import * as Tf from '../type_flags';
import * as Fp from './flight_patterns';
import * as Ph from '../phys';
import * as Gem from '../gem';
import * as So from '../sound';
import * as U from '../util/util';
import * as Eu from './enemy_util';
import * as K from '../konfig';
import * as D from '../debug';
import { RGBA } from '../color';
import { DebugGraphics } from '../debug_graphics';

export interface EnemySpec {
    fighter_kind: string,
    lt?: G.V2D,
    anim: A.AnimatorDimensions,
    rank: S.Rank,
    hp_init: number,
    spawn_strong?: boolean,
    damage: number,
    weapons: S.Arsenal,
    explosion_kind?: S.ExplosionKind, // default is S.ExplosionKind.regular
    flight_pattern: Fp.FlightPattern,
    gem_count: number,
    shield_alpha?: number,
    shield_scale?: G.V2D,
    in_cmask? : C.CMask, // default is C.Cmask.enemy
    flying_sfx?: So.Sfx,
    hardpoint_left?: (r: G.Rect) => G.V2D,
    hardpoint_right?: (r: G.Rect) => G.V2D,
    on_death?: (db: GDB.GameDB, self: S.Enemy) => void,
}

export function add_enemy(db: GDB.GameDB, spec: EnemySpec, rect: G.Rect, get_container: (db: GDB.GameDB) => U.Dict<S.Enemy>): U.O<S.Enemy> {
    const sprite: U.O<EnemyPrivate> = GDB.add_sprite_dict_id_mut(
        get_container(db),
        (dbid: GDB.DBID): U.O<EnemyPrivate> => sprite_mk(db, rect, spec)
    );
    if (sprite != null) {
        add_shield(db, sprite, spec);
    }
    return sprite;
}

function warpin_mk(db: GDB.GameDB, size: G.V2D, resource_id: string, spec: EnemySpec, get_container: (db: GDB.GameDB) => U.Dict<S.Enemy>): U.O<S.Warpin> {
    const lt = Eu.safe_lt(db, spec.rank, size, Rnd.singleton, spec.lt);
    const rect = G.rect_mk(lt, size);
    spec.lt = lt;
    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
    return A.warpin_mk(
        db,
        {
	    fighter_kind: spec.fighter_kind,
            duration_msec: K.WARPIN_TOTAL_MSEC,
            rect,
            resource_id: db.uncloned.images.lookup(resource_id),
            rank: spec.rank,
            on_end: (db: GDB.GameDB) => {
		add_enemy(db, spec, rect, get_container); }
        }
    );
}

export function warpin_mk_enemy(db: GDB.GameDB, size: G.V2D, resource_id: string, spec: EnemySpec): U.O<S.Warpin> {
    return warpin_mk(db, size, resource_id, spec, (db: GDB.GameDB) => { return db.shared.items.enemies; });
}

export function warpin_mk_munchie(db: GDB.GameDB, size: G.V2D, resource_id: string, spec: EnemySpec): U.O<S.Warpin> {
    return warpin_mk(db, size, resource_id, spec, (db: GDB.GameDB) => { return db.shared.items.munchies; });
}

interface EnemyPrivate extends S.Enemy {
    lifecycle: GDB.Lifecycle;
    last_hit_msec: number;
    step_return_fire(db: GDB.GameDB): boolean;
    step_delta_acc(db: GDB.GameDB): G.V2D;
    step_add_shots(db: GDB.GameDB): void;
    flight_pattern: Fp.FlightPattern;
}

export function sprite_mk(db: GDB.GameDB, rect: G.Rect, spec: EnemySpec): U.O<EnemyPrivate> {
    return GDB.id_mut(
        (dbid: GDB.DBID) => {
            // todo: hard-coded #s here maybe should be world height %ages instead.
            const e: EnemyPrivate = {
                dbid,
		fighter_kind: spec.fighter_kind,
                comment: `enemy-${dbid}-${spec.rank}`,
                ...rect,
                facing: F.DefaultFacing,
                // todo: extract this.
                flight_pattern: spec.flight_pattern,
                vel: G.v2d_mk_0(),
                acc: G.v2d_mk_0(),
                rank: spec.rank,
                mass: S.rank2mass(spec.rank),
                type_flags: Tf.TF.enemyShip,
                weapons: spec.weapons,
		explosion_kind: spec.explosion_kind ?? S.ExplosionKind.regular,
                z_ids: spec.anim.z_ids(db, F.DefaultFacing, false, 1),
                alpha: 1,
                lifecycle: GDB.Lifecycle.alive,
                last_hit_msec: 0,
                step(db: GDB.GameDB) {
                    this.step_add_shots(db);
                    const delta_acc = this.step_delta_acc(db);
                    const t = 1; // todo: i need to know what my shield is so i can get the hp-t.
                    const thrusting = G.v2d_len2(delta_acc) > Number.EPSILON;
                    this.z_ids = spec.anim.z_ids(db, this.facing, thrusting, t);
                    Ph.p2d_force_drag_step_mut(this, delta_acc, db.local.frame_dt);
                    this.lt = G.v2d_wrapH(this.lt, db.shared.world.bounds0);
		    if (U.exists(spec.flying_sfx)) {
			db.shared.sfx.push(spec.flying_sfx);
		    }
                },
                step_delta_acc(db: GDB.GameDB): G.V2D {
                    const delta_acc = this.flight_pattern.step_delta_acc(db, this);
                    const facing = F.v2f(delta_acc);
                    if (facing != null) { this.facing = facing; }
                    return delta_acc;
                },
                step_return_fire(db: GDB.GameDB): boolean {
                    const delta = db.shared.sim_now - this.last_hit_msec;
                    const chance = Rnd.singleton.boolean(0.1);
                    const return_fire =
			  delta < K.ENEMY_RETURN_FIRE_MAX_MSEC &&
			  delta > K.ENEMY_RETURN_FIRE_MIN_MSEC &&
			  chance;
                    if (return_fire) {
                        this.last_hit_msec = 0;
                    }
                    return return_fire;
                },
                step_add_shots(db: GDB.GameDB) {
                    const return_fire = this.step_return_fire(db);
		    const in_bounds = Eu.can_shoot_in_bounds(db, this);
                    if (return_fire || in_bounds) {
                        U.if_let(
                            GDB.get_player(db),
                            (p: S.Player) => {
                                if (G.rects_are_overlapping(this, db.shared.world.gameport.world_bounds)) {
                                    Object.values(this.weapons).forEach(w => {
                                        const shot = w?.shot_mk(db, this, return_fire);
                                    });
                                }
                            }
                        );
                    }
                },
                set_lifecycle(lifecycle: GDB.Lifecycle) {
                    this.lifecycle = lifecycle;
                },
                get_lifecycle(_: GDB.GameDB): GDB.Lifecycle {
                    return this.lifecycle;
                },
                on_collide(db: GDB.GameDB, dst: S.CollidableSprite): void {
                    this.last_hit_msec = db.shared.sim_now;
                },
                on_death(db: GDB.GameDB) {
                    D.log(`on_death(): ${this.comment}`);
                    // scoring: assumes that they can only be destroyed by the player.
                    db.local.scoring.on_event(Sc.rank2event(this.rank));
                    // gems: should be delayed enough that the player
                    // cannot just keep smashing through enemies and
                    // restoring health from the subsequent gem.
                    GDB.add_dict_id_mut(
                        db.local.ticking_generators,
                        (dbid: GDB.DBID): U.O<Tkg.TickingGenerator<boolean>> =>
                            Tkg.ticking_generator_mk(db, dbid, {
                                generations: 1,
                                delay_msec: 500,
                                tick_msec: 1,
                                generate: (db: GDB.GameDB) => {
                                    Gem.gems_add(db, G.rect_mid(this), spec.gem_count);
                                    return true;
                                }
                            })
                    );
		    spec.on_death?.(db, this);
                },
                toJSON() {
                    return S.spriteJSON(this);
                },
                get_weapon_hardpoint(_: S.WeaponType, facing: F.Facing): G.V2D {
                    switch (facing) {
                        case F.Facing.left: {
                            if (spec.hardpoint_left != null) {
                                return spec.hardpoint_left(this);
                            }
                            else {
                                return G.rect_lm(this);
                            }
                        }
                        case F.Facing.right: {
                            if (spec.hardpoint_right != null) {
                                return spec.hardpoint_right(this);
                            }
                            else {
                                return G.rect_rm(this);
                            }
                        }
                    }
                }        
            }
            return e;
        }
    );
}

function add_shield(db: GDB.GameDB, enemy: EnemyPrivate, spec: EnemySpec) {
    const images = db.uncloned.images;
    Sh.add_fighter_shield(db, {
        resource_id: images.lookup("shield/shield2.png"),
        enlarge: spec.shield_scale ?? K.SHIELD_SCALE,
        fighter: enemy,
        hp_init: spec.hp_init,
	spawn_strong: spec.spawn_strong,
        damage: spec.damage,
        comment: `enemy-FF-shield-${enemy.dbid}`,
        in_cmask: spec.in_cmask ?? C.CMask.enemy,
        from_cmask: C.CMask.player | C.CMask.playerShot,
        alpha: spec.shield_alpha,
    });
}
