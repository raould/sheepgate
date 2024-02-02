import * as GDB from '../game_db';
import * as G from '../geom';
import * as S from '../sprite';
import * as Esb from './enemy_smartbomb';
import * as Cd from '../cooldown';
import * as C from '../collision';
import * as U from '../util/util';
import * as K from '../konfig';

export interface EnemyWeaponSpec extends C.Masked {
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
}

export function weapon_mk(spec: EnemyWeaponSpec): S.Weapon {
	const w: EnemyWeaponPrivate = {
		...spec,
		weapon_type: S.WeaponType.ball,
		at_dst: undefined,
		clip: Cd.clip_mk({
			...spec.clip_spec,
			// match/todo: this deeply sucks, just ask me.
			// reload_spec will be extended once we have the 'w' pointer, below.
			// because it is too nested to be able to use 'this' here afaict.
		}),
		shot_mk(db: GDB.GameDB, src: S.Fighter): U.O<GDB.Identity> {
			return U.if_let(
				GDB.get_player(db),
				(dst: S.Player) => {
					if (this.clip.maybe_fire(db.shared.sim_now)) {
                        const lt: G.V2D = G.rect_mid(src);
                        return GDB.add_sprite_dict_id_mut(
                            db.shared.items.enemies,
                            (dbid: GDB.DBID): U.O<S.Enemy> => Esb.smartbomb_mk(db, lt)
                        );
					}
                }
			);
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

// todo: i wish i could use macros/reflection to just build this with SMALL, MEGA, HYPERMEGA.

const ENEMY_SHOT_DAMAGE = K.PLAYER_HP / 10;
const ENEMY_SHOT_SPEED = 0.15; // L, W
const ENEMY_SHOT_SIZE = Esb.SIZE;
const ENEMY_SHOT_LIFE_MSEC = Number.MAX_SAFE_INTEGER; // L, W
const ENEMY_WEAPON_CLIP_COOLDOWN_MSEC = 3000; // L, W
const ENEMY_WEAPON_SHOT_COOLDOWN_MSEC = 125; // L, W
const ENEMY_WEAPON_SHOT_COUNT = 1; // L, W

export function get_spec(): EnemyWeaponSpec {
    return {
        clip_spec: {
            reload_spec: {
                duration_msec: ENEMY_WEAPON_CLIP_COOLDOWN_MSEC,
                on_reload: () => { },
            },
            shot_spec: {
                duration_msec: ENEMY_WEAPON_SHOT_COOLDOWN_MSEC,
            },
            count: ENEMY_WEAPON_SHOT_COUNT,
        },
        shot_damage: ENEMY_SHOT_DAMAGE,
        shot_speed: ENEMY_SHOT_SPEED,
        shot_size: ENEMY_SHOT_SIZE,
        shot_life_msec: ENEMY_SHOT_LIFE_MSEC,
        in_cmask: C.CMask.enemyShot,
        from_cmask: C.CMask.player | C.CMask.base,
    }
}
