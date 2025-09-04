/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Eu from './enemy_util';
import * as GDB from '../game_db';
import * as G from '../geom';
import * as S from '../sprite';
import * as So from '../shot';
import * as Cd from '../cooldown';
import * as F from '../facing';
import * as C from '../collision';
import * as A from '../animation';
import * as U from '../util/util';
import * as K from '../konfig';
import * as D from '../debug';

export interface EnemyWeaponSpec extends C.Masked {
    // the enemy has to be facing in one of the
    // supported spec.direction in order to fire this weapon.
    direction: F.Facing;
    clip_spec: Cd.ClipSpec;
    shot_damage: number;
    shot_speed: number;
    shot_size: G.V2D;
    shot_life_msec: number;
}

// todo: i really don't have a good way to define specs vs. the
// instances that use them, where i can keep the right things
// public vs. private, so i have like at least 3 different hacky
// ways of doing that. :-(
export interface EnemyWeapon extends EnemyWeaponSpec, S.Weapon {
}

interface EnemyWeaponPrivate extends EnemyWeapon {
    at_dst: U.O<G.V2D>;
    clip: Cd.Clip;
    calculate_shot_lt(src: S.Enemy, at_vel: G.V2D): G.V2D;
}

export function weapon_mk(spec: EnemyWeaponSpec): S.Weapon {
    const w: EnemyWeaponPrivate = {
	...spec,
	weapon_type: S.WeaponType.bullet,
	at_dst: undefined,
	clip: Cd.clip_mk({
	    ...spec.clip_spec,
	    // match/todo: this deeply sucks, just ask me.
	    // reload_spec will be extended once we have the 'w' pointer, below.
	    // because it is too nested to be able to use 'this' here afaict.
	}),
	calculate_shot_lt(src: S.Enemy, at_vel: G.V2D): G.V2D {
	    if (G.v2d_smells_left(at_vel)) {
		const hardpoint = src.get_weapon_hardpoint(this.weapon_type, F.Facing.left);
		return G.v2d_sub(hardpoint, G.v2d_x0(spec.shot_size));
	    }
	    else {
		const hardpoint = src.get_weapon_hardpoint(this.weapon_type, F.Facing.right);
		return hardpoint;
	    }
	},
	shot_mk(db: GDB.GameDB, src: S.Fighter, forced: boolean): U.O<GDB.Identity> {
	    U.if_let(
		GDB.get_player(db),
		(dst: S.Player) => {
		    const at_vel = calculate_at_vel(db, src, dst, spec);
		    U.if_let(
			F.v2f(at_vel),
			at_facing => {
			    const lt = this.calculate_shot_lt(src, at_vel)
			    const is_facing_src = this.direction == src.facing;
			    const is_facing_at = this.direction == at_facing;
			    const now = db.shared.sim_now;
			    if (is_facing_src && is_facing_at && (forced||this.clip.maybe_fire(now))) {
				db.shared.sfx.push({ sfx_id: K.SHOT2_SFX });
				const dbid = GDB.id_mk();
				return So.shot_mk(db, src, {
				    lt: lt,
				    dbid: dbid,
				    comment: `enemy-bullet-${src.dbid}-${dbid}`,
				    anim: A.same_facing_animator_mk(
					db.shared.sim_now,
					{ resource_id: db.uncloned.images.lookup("shots/enemy_bullet.png") },
				    ),
				    size: spec.shot_size,
				    life_msec: spec.shot_life_msec,
				    damage: spec.shot_damage,
				    in_cmask: spec.in_cmask,
				    from_cmask: spec.from_cmask,
				    vel: at_vel,
				    alpha: 1,
				});
			    }
			}
		    )
		}
	    )
	    return undefined;
	}
    }
    // match/todo: this deeply sucks, just ask me.
    w.clip.reload_spec = {
	...spec.clip_spec.reload_spec,
	on_reload: () => {
	    spec.clip_spec.reload_spec.on_reload();
	    w.at_dst = undefined;
	}
    }
    return w as S.Weapon;
}

// todo: well for the bullet weapon this is
// stupid overkilly copy-paste from the ball
// weapon - the bullets can only go straight.
function calculate_at_vel(db: GDB.GameDB, src: S.Fighter, dst: G.Rect, spec: EnemyWeaponSpec): G.V2D {
    const norm = F.f2v(src.facing);
    const min = G.v2d_scale(norm, spec.shot_speed);
    const src_vnorm = G.v2d_norm(src.vel);
    const dot = G.v2d_dot(src_vnorm, norm);
    let boost = G.v2d_mk_0();
    if (dot > 0) {
	boost = src.vel;
    }
    return G.v2d_add(min, boost);
}

// by convention we return (left, right).
export function scale_specs(level: number, rank: S.Rank): [EnemyWeaponSpec, EnemyWeaponSpec] {
    return [
        scale_spec(level, rank, F.Facing.left),
        scale_spec(level, rank, F.Facing.right)
    ];
}

export function scale_spec(level: number, rank: S.Rank, direction: F.Facing): EnemyWeaponSpec {
    switch (rank) {
    case S.Rank.basic:
        return enemy_basic_spec(level, direction);
    case S.Rank.small:
        return enemy_small_spec(level, direction);
    case S.Rank.mega:
        return enemy_mega_spec(level, direction);
    case S.Rank.hypermega:
        return enemy_hypermega_spec(level, direction);
    case S.Rank.player:
        // todo: argues for splitting enemy vs. player ranks, duh.
        D.assert_fail("scale_spec(): only supports enemy ranks.");
        // satisfy the compiler by returning something.
        return enemy_small_spec(level, direction);
    }
}

// fyi: 'basic', 'small', etc., here are enemy Rank, not the size of the bullet.
// note: shot values are max over level scaling.
// note: cooldowns are min over level scaling.
// note: the values range until the first looped level, then stays at the extreme.

const BASIC_SPEC = {
    ENEMY_SHOT_DAMAGE: K.PLAYER_HP / 10, // L, W
    ENEMY_SHOT_SPEED: K.d2s(0.1), // L, W
    ENEMY_SHOT_SIZE: K.BULLET_SHOT_SIZE,
    ENEMY_SHOT_LIFE_MSEC: K.BULLET_SHOT_LIFE_MSEC, // L, W
    ENEMY_WEAPON_CLIP_COOLDOWN_MSEC: 9*1000, // L, W
    ENEMY_WEAPON_SHOT_COOLDOWN_MSEC: 500, // L, W
    ENEMY_WEAPON_SHOT_COUNT: 1, // L, W
};
D.assert(BASIC_SPEC.ENEMY_SHOT_DAMAGE >= 0.1);

const SMALL_SPEC = {
    ENEMY_SHOT_DAMAGE: K.PLAYER_HP / 5, // L, W
    ENEMY_SHOT_SPEED: K.d2s(0.25), // L, W
    ENEMY_SHOT_SIZE: K.BULLET_SHOT_SIZE,
    ENEMY_SHOT_LIFE_MSEC: K.BULLET_SHOT_LIFE_MSEC, // L, W
    ENEMY_WEAPON_CLIP_COOLDOWN_MSEC: 9*1000, // L, W
    ENEMY_WEAPON_SHOT_COOLDOWN_MSEC: 250, // L, W
    ENEMY_WEAPON_SHOT_COUNT: 4, // L, W
};
D.assert(SMALL_SPEC.ENEMY_SHOT_DAMAGE >= 0.1);

const MEGA_SPEC = {
    ENEMY_SHOT_DAMAGE: K.PLAYER_HP / 4, // L, W
    ENEMY_SHOT_SPEED: K.d2s(0.25), // L, W
    ENEMY_SHOT_SIZE: K.BULLET_SHOT_SIZE,
    ENEMY_SHOT_LIFE_MSEC: K.BULLET_SHOT_LIFE_MSEC, // L, W
    ENEMY_WEAPON_CLIP_COOLDOWN_MSEC: 8*1000, // L, W
    ENEMY_WEAPON_SHOT_COOLDOWN_MSEC: 300, // L, W
    ENEMY_WEAPON_SHOT_COUNT: 5, // L, W
};
D.assert(MEGA_SPEC.ENEMY_SHOT_DAMAGE >= 0.1);

const HYPERMEGA_SPEC = {
    ENEMY_SHOT_DAMAGE: K.PLAYER_HP / 3, // L, W
    ENEMY_SHOT_SPEED: K.d2s(0.25), // L, W
    ENEMY_SHOT_SIZE: K.BULLET_SHOT_SIZE,
    ENEMY_SHOT_LIFE_MSEC: K.BULLET_SHOT_LIFE_MSEC, // L, W
    ENEMY_WEAPON_CLIP_COOLDOWN_MSEC: 7*1000, // L, W
    ENEMY_WEAPON_SHOT_COOLDOWN_MSEC: 300, // L, W
    ENEMY_WEAPON_SHOT_COUNT: 6, // L, W
};
D.assert(HYPERMEGA_SPEC.ENEMY_SHOT_DAMAGE >= 0.1);

// todo: meta-build these boilerplate-hell functions? sheesh.

function enemy_from_spec(level: number, direction: F.Facing, spec: any): EnemyWeaponSpec {
    return {
	direction,
        clip_spec: {
            reload_spec: {
                duration_msec: Eu.level_scale_down(
		    level,
		    spec.ENEMY_WEAPON_CLIP_COOLDOWN_MSEC * 2,
		    spec.ENEMY_WEAPON_CLIP_COOLDOWN_MSEC,
		    Math.round
		),
                on_reload: () => { },
            },
            shot_spec: {
		duration_msec: spec.ENEMY_WEAPON_SHOT_COOLDOWN_MSEC,
	    },
            count: Eu.level_scale_up(
		level,
		1,
		spec.ENEMY_WEAPON_SHOT_COUNT,
		Math.round
	    ),
        },
        shot_damage: Eu.level_scale_up(
	    level,
	    spec.ENEMY_SHOT_DAMAGE / 2,
	    spec.ENEMY_SHOT_DAMAGE,
	),
        shot_speed: spec.ENEMY_SHOT_SPEED,
        shot_size: spec.ENEMY_SHOT_SIZE,
        shot_life_msec: spec.ENEMY_SHOT_LIFE_MSEC,
        in_cmask: C.CMask.enemyShot,
        from_cmask: C.CMask.player | C.CMask.base,
    }
}

function enemy_basic_spec(level: number, direction: F.Facing): EnemyWeaponSpec {
    return enemy_from_spec(level, direction, BASIC_SPEC);
}

function enemy_small_spec(level: number, direction: F.Facing): EnemyWeaponSpec {
    return enemy_from_spec(level, direction, SMALL_SPEC);
}

function enemy_mega_spec(level: number, direction: F.Facing): EnemyWeaponSpec {
    return enemy_from_spec(level, direction, MEGA_SPEC);
}

function enemy_hypermega_spec(level: number, direction: F.Facing): EnemyWeaponSpec {
    return enemy_from_spec(level, direction, HYPERMEGA_SPEC);
}

