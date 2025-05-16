import * as GDB from './game_db';
import * as G from './geom';
import * as S from './sprite';
import * as So from './shot';
import * as C from './collision';
import * as Cd from './cooldown';
import * as U from './util/util';
import * as A from './animation';
import * as F from './facing';
import * as Rnd from './random';
import * as _ from 'lodash';

export interface PlayerWeaponSpec extends C.Masked {
    clip_spec: Cd.ClipSpec;
    shot_damage: number;
    shot_speed: number;
    shot_size: G.V2D;
    shot_life_msec: number;
}

export interface PlayerWeapon extends PlayerWeaponSpec, S.Weapon {
}

interface PlayerWeaponPrivate extends PlayerWeapon {
    clip: Cd.Clip;
}

export function player_weapon_mk(spec: PlayerWeaponSpec): S.Weapon {
    let anim_index = 0;
    const w: PlayerWeaponPrivate = {
	...spec,
	weapon_type: S.WeaponType.bullet,
	clip: Cd.clip_mk({
	    ...spec.clip_spec,
	    // match/todo: this deeply sucks, just ask me.
	    // reload_spec will be extended once we have the 'w' pointer, below.
	    // because it is too nested to be able to use 'this' here afaict.
	}),
	shot_mk(db: GDB.GameDB, src: S.Fighter, forced: boolean): U.O<GDB.Identity> {
	    const now = db.shared.sim_now;
	    if (!forced && !this.clip.maybe_fire(now)) {
		return undefined;
	    }
	    const lt = (() => {
		// todo: such a horrible hack. instead, get sprite image
		// resource layer working to mark hardpoints.
		// todo: adjust for ship speed so they don't visually immediately overlap.
		const lt_sx = -0.1;
		const lt_sy = 0.5;
		const lt_middle = F.on_facing(src.facing,
					      G.v2d_sub(
						  G.v2d_add(src.lt, G.v2d_scale_v2d(src.size, G.v2d_mk(lt_sx, lt_sy))),
						  G.v2d_mk(2 * spec.shot_size.x, 0)
					      ),
					      G.v2d_add(
						  G.v2d_add(src.lt, G.v2d_scale_v2d(src.size, G.v2d_mk(1 - lt_sx, lt_sy))),
						  G.v2d_mk(spec.shot_size.x, 0)
					      )
					     );
		const lt = Rnd.singleton.v2d_around(
		    lt_middle,
		    G.v2d_mk_0y(5)
		)
		return lt;
	    })();
	    const images = db.uncloned.images;
	    const anims = [
		A.facing_animator_mk(
		    now,
		    { resource_id: images.lookup("shots/bullet_shot_l.png") },
		    { resource_id: images.lookup("shots/bullet_shot_r.png") },
		),
		A.facing_animator_mk(
		    now,
		    { resource_id: images.lookup("shots/bullet_shot_2l.png") },
		    { resource_id: images.lookup("shots/bullet_shot_2r.png") },
		),
		A.facing_animator_mk(
		    now,
		    { resource_id: images.lookup("shots/bullet_shot_3l.png") },
		    { resource_id: images.lookup("shots/bullet_shot_3r.png") },
		)
	    ];
	    const anim = U.element_looped(anims, anim_index++)!;
	    const vel = G.v2d_scale(F.f2v(src.facing), spec.shot_speed)
	    // is the player aiming in the same direction as their velocity?
	    if (U.sign(F.f2v(src.facing).x) == U.sign(src.vel.x)) {
		// the bullet needs to move faster so the ship doesn't catch up.
		G.v2d_add_mut(vel, G.v2d_mk(src.vel.x, 0));
	    }
	    const dbid = GDB.id_mk();
	    return So.shot_mk(db, src, {
		dbid: dbid,
		comment: `player-shot-${src.dbid}-${dbid}`,
		lt: lt,
		size: spec.shot_size,
		// todo: make them fade/fizzle out if on-screen still?
		// instead of just disappearing? ideally the shots wouldn't
		// actually even be so slow, but they were missing collisions
		// so i slowed them down, which means now the player can
		// actually race them and keep them on-screen for their
		// whole lifetime. oy veh.
		// todo: at least make the lifetime a calculation of
		// how wide the screen is / velocity.
		life_msec: spec.shot_life_msec,
		vel: vel,
		alpha: 1,
		damage: spec.shot_damage,
		in_cmask: spec.in_cmask,
		from_cmask: spec.from_cmask,
		anim: anim,
		step(db: GDB.GameDB, dbid: GDB.DBID) {
		    U.if_let(
			GDB.get_shot(db, dbid),
			shot => {
			    // todo: blah, hardcoded magic.
			    shot.alpha = 0.8 + 0.2 * U.clip01(shot.life_msec / spec.shot_life_msec);
			    const size2 = G.v2d_scale_v2d(shot.size, G.v2d_mk(1.3, 1));
			    shot.lt = F.on_facing(
				shot.facing,
				G.v2d_sub(
				    G.rect_rb(shot),
				    size2
				),
				shot.lt
			    );
			    shot.size = size2;
			    // todo: blah, don't let them shoot (too far) offscreen.
			    // todo: why does this not work right e.g. when thrusting full speed?
			    U.if_let(
				G.rect_clipH_inside(shot, db.shared.world.gameport.world_bounds),
				safe_rect => G.rect_set(safe_rect, shot)
			    );
			}
		    );
		}
	    });
	}
    }
    // match/todo: this deeply sucks, just ask me.
    w.clip.reload_spec = {
	...spec.clip_spec.reload_spec,
	on_reload: () => {
	    spec.clip_spec.reload_spec.on_reload();
	}
    }
    return w as S.Weapon;
}
