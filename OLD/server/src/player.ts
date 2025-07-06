/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as S from './sprite';
import * as G from './geom';
import * as F from './facing';
import * as Ph from './phys';
import * as Pw from './player_weapon';
import * as Sh from './fighter_shield';
import * as C from './collision';
import * as Tf from './type_flags';
import * as Gr from './ground';
import * as A from './animation';
import * as U from './util/util';
import * as GDB from './game_db';
import * as Cmd from './commands';
import * as K from './konfig';
import * as Sc from './scoring';
import * as So from './sound';
import * as Rnd from './random';
import * as Dr from './drawing';
import { RGBA } from './color';

const BOUNCE_MSEC = 250;

const thrust_sfx: So.Sfx = {
    sfx_id: K.THRUST_SFX,
    gain: 0.2,
    singleton: true
};

export type PlayerSpec = {
    player_kind: S.PlayerKind;
    disable_beaming: boolean;
    facing: F.Facing;
    lt: G.V2D;
}

export type PlayerShadowSpec = {
    player_kind: S.PlayerKind;
    facing: F.Facing;
    lt: G.V2D;
}

interface PlayerSpritePrivate extends S.Player {
    disable_beaming: boolean;
    lt_wiggle: G.V2D;
    lifecycle: GDB.Lifecycle;
    still_anim: A.FacingResourceAnimator;
    thrusting_anim: A.FacingResourceAnimator;
    step_pos(db: GDB.GameDB, delta_acc_x: number, delta_vel_y: number): void;
    step_resource_id(db: GDB.GameDB, delta_acc_x: number): void;
    bounce_fx?: U.O<Dr.DrawLine[]>;
    bounce_msec?: U.O<number>;
}

export function player_shadow_mk(db: GDB.GameDB, dbid: GDB.DBID, spec: PlayerShadowSpec): S.Sprite {
    const images = db.uncloned.images;
    // x-backwards from the ship, yes.
    const left_rid = images.lookup("player/p1_s_right.png");
    const right_rid = images.lookup("player/p1_s_left.png");
    const size = get_shadow_size(spec.player_kind);
    const shadow = {
	dbid: dbid,
	comment: `player-shadow-${dbid}`,
	lt: spec.lt,
	size,
	vel: G.v2d_mk_0(),
	acc: G.v2d_mk_0(),
	alpha: 1,
	facing: spec.facing,
	resource_id: F.on_facing(spec.facing, left_rid, right_rid),
        step(db: GDB.GameDB) {
	    U.if_let(
		GDB.get_player(db),
		player => {
		    this.facing = player.facing;
		    this.resource_id = F.on_facing(this.facing, left_rid, right_rid);
		    this.lt = G.v2d_set_y(
			player.lt,
			K.GAMEPORT_RECT.size.y - size.y * 2
		    );
		}
	    );
	},
        get_lifecycle(_:GDB.GameDB): GDB.Lifecycle {
            return GDB.Lifecycle.alive;
        },
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        },
    };
    return shadow;
}

export function player_mk(db: GDB.GameDB, dbid: GDB.DBID, spec: PlayerSpec): S.Player {
    const p: PlayerSpritePrivate = {
        ...spec,
        dbid,
	fighter_kind: "player",
        comment: `player-${dbid}`,
        lt: spec.lt,
	lt_wiggle: spec.lt,
        size: get_player_size(spec.player_kind),
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        alpha: 1,
        rank: S.Rank.player,
        still_anim: still_anim_mk(db, spec.player_kind),
        thrusting_anim: thrusting_anim_mk(db, spec.player_kind),
        type_flags: Tf.TF.playerShip,
        weapons: weapons_mk(spec.player_kind),
	explosion_kind: spec.player_kind === S.PlayerKind.cbm ? S.ExplosionKind.cbm : S.ExplosionKind.regular,
        lifecycle: GDB.Lifecycle.alive,
        step(db: GDB.GameDB) {
            // regular physics movement for x, heuristic for y.
            // x should match: phys
            const delta_acc_x = get_player_acc_x(this, db);
            const delta_vel_y = get_player_vel_y(this, db);
            this.step_pos(db, delta_acc_x, delta_vel_y);
            this.step_resource_id(db, delta_acc_x);
	    if (delta_acc_x != 0) {
		db.shared.sfx.push(thrust_sfx);
	    }
	    if (U.exists(this.bounce_fx) && U.exists(this.bounce_msec)) {
		const dt = db.shared.sim_now - this.bounce_msec;
		const alpha = U.t10(0, BOUNCE_MSEC, dt);
		this.bounce_fx.forEach(line => line.color = line.color.setAlpha01(alpha));
		db.shared.frame_drawing.lines.push(...this.bounce_fx);
		if (dt > BOUNCE_MSEC) {
		    this.bounce_fx = undefined;
		}
	    }
        },
        step_pos(db: GDB.GameDB, delta_acc_x: number, delta_vel_y: number) {
            // note: jsyk this entire wall of text is the result
            // of empirical testing & hacking, so is fragile.

            // 1) regular physics movement for x, hacky heuristic for y.
            // x should match: phys
            G.v2d_add_mut(this.acc, G.v2d_mk_x0(delta_acc_x));
            if (U.sign(delta_vel_y) != 0) { this.vel.y = delta_vel_y; }
            G.v2d_add_mut(this.acc, Ph.drag(this));
            Ph.p2d_step_mut(this,  db.local.frame_dt);
            G.v2d_deadzone(this.vel, Ph.MIN_VEL_CLAMP);

            // 2) clipping, adjustments based on environment.
            G.rect_wrapH_mut(this, db.shared.world.bounds0);
            // just the ground y constraint, as the sky was handled in apply_sky_force_mut().
            this.lt.y = Math.min(db.shared.world.bounds0.y - this.size.y, this.lt.y);
            const max_y = Gr.p2d_max_ys(db, this);
            // 2.b) adjust vertical, todo: -20 is a fudge (!) to give some space between ship and ground things.
            this.lt.y = Math.min(this.lt.y, max_y - this.size.y - K.d2s(20));

             // 3) some buffer ie so that your sheild and hp bar don't go off-screen.
             // todo: make it dynamically calculated based on the hp bar position.
            this.lt.y = Math.max(this.lt.y, K.d2s(25));

	    const oy = Math.sin(db.shared.tick/20) * K.d2s(3);
	    this.draw_lt = G.v2d_add_y(this.lt, oy);
        },
        step_resource_id(db: GDB.GameDB, delta_acc_x: number) {
            const facing = F.facing_for_inputs(db.local.client_db.inputs);
            if (facing != null) { this.facing = facing; }
            this.z_back_to_front_ids = [];
            const is_thrusting = Math.abs(delta_acc_x) > Number.EPSILON;
	    const anim = is_thrusting ? this.thrusting_anim : this.still_anim;
            this.z_back_to_front_ids.push(
                ...anim.z_back_to_front_ids(db, this.facing) || K.EMPTY_IMAGE_RESOURCE_ID
            );
        },
        set_lifecycle(lifecycle: GDB.Lifecycle) {
            this.lifecycle = lifecycle;
        },
        get_lifecycle(_:GDB.GameDB): GDB.Lifecycle {
            return this.lifecycle;
        },
	// todo: this really kind of sucks as the only way to detect beaming proximity.
	// means it is pretty fragile/sensitive vs. how it looks on the screen, doesn't allow for much gap,
	// e.g. is annoying for sheep.
        on_collide(db: GDB.GameDB, c: S.CollidableSprite): void {
	    if (this.disable_beaming !== true) {
		this.maybe_beam_up_person(db, c);
		this.maybe_beam_down_to_base(db, c);
	    }
        },
	bounce(db: GDB.GameDB, c: S.Sprite): void {
	    const dx = this.lt.x - c.lt.x;
	    const sign = U.sign(dx);
	    const bdx = sign * Rnd.singleton.int_around(
		K.SCREEN_BOUNDS0.x * 0.5,
		K.SCREEN_BOUNDS0.x * 0.1
	    );
	    const blt = G.v2d_add_x(this.lt, bdx);
	    const y = G.rect_mid(this).y
	    const line: Dr.DrawLine = {
		wrap: false,
		line_width: K.d2si(3),
		color: RGBA.MAGENTA,
		p0: G.v2d_mk(blt.x, y),
		p1: G.v2d_mk(this.lt.x, y),
	    };
	    this.bounce_msec = db.shared.sim_now;
	    this.bounce_fx = Dr.sizzlerLine_mk(
		line,
		20,
		K.d2si(5),
		Rnd.singleton
	    );
	    this.lt = blt;
	},
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        },
        get_weapon_hardpoint(_: S.WeaponType, facing: F.Facing): G.V2D {
            switch (facing) {
                case F.Facing.left: return G.rect_lm(this);
                case F.Facing.right: return G.rect_rm(this);
            }
        },
        maybe_shoot(db: GDB.GameDB) {
            // todo: some day more buttons for more weapons.
            U.if_let(
                this,
                p => Object.values(p.weapons).forEach(w => {
                    const s = w.shot_mk(db, p, false);
                    if (!!s) {
			const sfx_id = Rnd.singleton.choose(
			    K.PLAYER_SHOOT0_SFX,
			    K.PLAYER_SHOOT1_SFX,
			    K.PLAYER_SHOOT2_SFX
			);
			if (!!sfx_id) {
                            db.shared.sfx.push({
				gain: 0.5,
				sfx_id,
			    })
			}
                    }
                })
            );
        },
        maybe_beam_up_person(db: GDB.GameDB, maybe_person: S.CollidableSprite) {
            const vel2 = G.v2d_len2(this.vel);
	    const buffer_count = GDB.get_beaming_count(db);
            if (vel2 <= K.PLAYER_BEAM_MAX_VEL2 &&
                U.has_bits_eq(maybe_person.type_flags, Tf.TF.person) && buffer_count < 1) {
                const pid = maybe_person.dbid;
                U.if_let(
                    GDB.get_person(db, pid),
                    person => {
                        person.beam_up(db);
                    }
                );
            }
        },
        maybe_beam_down_to_base(db: GDB.GameDB, maybe_base_shield: S.CollidableSprite) {
            const vel2 = G.v2d_len2(this.vel);
            const bits = U.has_bits_eq(maybe_base_shield.type_flags, Tf.TF.baseShield);
            if (bits && GDB.get_beaming_count(db) > 0 && vel2 <= K.PLAYER_BEAM_MAX_VEL2) {
                U.if_let(
                    GDB.get_shield(db, maybe_base_shield.dbid),
                    shield => {
                        const base = db.shared.items.base;
                        GDB.get_beamers(db).forEach(person => {
			    if (person.beaming_state != S.BeamingState.beaming_down) {
				person.beam_down(
				    db, base.beam_down_rect,
				    /*on_end*/(db: GDB.GameDB) => {
					U.if_let(
					    GDB.get_player(db), (thiz: S.Player) => {
						db.local.scoring.on_event(Sc.Event.rescue);
						U.if_let(
						    GDB.get_shield(db, this.shield_id), player_shield => {
							player_shield.hp = K.PLAYER_HP;
						    }
						);
					    }
					);
				    }
				);
			    }
			});
		    }
		)
	    }
	},
    }
    return p;
}

function weapons_mk(player_kind: S.PlayerKind): { [k: string]: S.Weapon } {
    const shot_size = (() => {
	switch (player_kind) {
	case S.PlayerKind.ship: {
	    return K.PLAYER_SHOT_SIZE;
	}
	case S.PlayerKind.cow: {
	    return K.PLAYER_SHOT_SIZE;
	}
	case S.PlayerKind.cbm: {
	    G.v2d_scale_y(K.PLAYER_SHOT_SIZE, 2);
	}
	case S.PlayerKind.zx: {
	    return G.v2d_scale_y(K.PLAYER_SHOT_SIZE, 2);
	}
	}
    })();
    return {
        w1: Pw.player_weapon_mk({
	    player_kind,
            clip_spec: {
                reload_spec: {
                    duration_msec: K.PLAYER_WEAPON_CLIP_COOLDOWN_MSEC,
                    on_reload: () => { },
                },
                shot_spec: {
                    duration_msec: K.PLAYER_WEAPON_SHOT_COOLDOWN_MSEC,
                },
                count: K.PLAYER_WEAPON_SHOT_COUNT,
            },
            shot_damage: K.PLAYER_SHOT_DAMAGE,
            shot_speed: K.PLAYER_SHOT_SPEED,
            // todo: hacking this to be long so that it is less
            // likely to skip overthings and thus not collide,
            // which is obviously really not an ok 'fix'.
            shot_size,
            shot_life_msec: K.PLAYER_SHOT_LIFE_MSEC,
            in_cmask: C.CMask.playerShot,
            from_cmask: C.CMask.enemy | C.CMask.enemy_bounce,
        })
    };
}

function get_shadow_size(player_kind: S.PlayerKind): G.V2D {
    switch (player_kind) {
    case S.PlayerKind.ship: {
	return K.vd2si(G.v2d_mk(76, 10));
    }
    case S.PlayerKind.cow: {
	return K.vd2si(G.v2d_mk(76, 10));
    }
    case S.PlayerKind.cbm: {
	return K.vd2si(G.v2d_mk(76, 10));
    }
    case S.PlayerKind.zx: {
	return K.vd2si(G.v2d_mk(76, 10));
    }
    }
}

export function get_player_size(player_kind: S.PlayerKind): G.V2D {
    switch (player_kind) {
    case S.PlayerKind.ship: {
	return K.vd2si(G.v2d_mk(76, 25));
    }
    case S.PlayerKind.cow: {
	return K.vd2si(G.v2d_scale_i(G.v2d_mk(32, 16), 2.4));
    }
    case S.PlayerKind.cbm: {
	return K.vd2si(G.v2d_scale_i(G.v2d_mk(56, 35), 1.5));
    }
    case S.PlayerKind.zx: {
	return K.vd2si(G.v2d_scale_i(G.v2d_mk(28, 18), 3.5));
    }
    }	
}

function still_anim_mk(db: GDB.GameDB, player_kind: S.PlayerKind): A.FacingResourceAnimator {
    const images = db.uncloned.images;
    switch (player_kind) {
    case S.PlayerKind.ship: {
	return A.facing_animator_mk(
            db.shared.sim_now,
	    {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_a((a) => `player/p1_${a}_left.png`, ['a', 'b', 'c']),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    },
	    {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_a((a) => `player/p1_${a}_right.png`, ['a', 'b', 'c']),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    },
	);
    }
    case S.PlayerKind.cow: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		resource_id: images.lookup("player/cowL.png"),
	    },
	    {
		resource_id: images.lookup("player/cowR.png"),
	    }
	);
    }
    case S.PlayerKind.cbm: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		resource_id: images.lookup("player/cbml.png"),
            },
            {
		resource_id: images.lookup("player/cbmr.png"),
            },
	);
    }
    case S.PlayerKind.zx: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		resource_id: images.lookup("player/zxL1.png"),
            },
            {
		resource_id: images.lookup("player/zxR1.png"),
            },
	);
    }
    }
}

function thrusting_anim_mk(db: GDB.GameDB, player_kind: S.PlayerKind): A.FacingResourceAnimator {
    const images = db.uncloned.images;
    switch (player_kind) {
    case S.PlayerKind.ship: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_a((a) => `player/p1_t${a}_left.png`, ['a', 'b', 'c']),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    },
	    {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_a((a) => `player/p1_t${a}_right.png`, ['a', 'b', 'c']),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    }
	);
    }
    case S.PlayerKind.cow: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_n((n) => `player/cowLT${n}.png`, 1, 2),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    },
	    {
		frame_msec: K.PLAYER_ANIM_FRAME_MSEC,
		resource_ids: images.lookup_range_n((n) => `player/cowRT${n}.png`, 1, 2),
		starting_mode: A.MultiImageStartingMode.hold,
		ending_mode: A.MultiImageEndingMode.loop
	    }
	);
    }
    case S.PlayerKind.cbm: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		resource_id: images.lookup("player/cbmlt.png"),
            },
            {
		resource_id: images.lookup("player/cbmrt.png"),
            },
	);
    }
    case S.PlayerKind.zx: {
	return A.facing_animator_mk(
            db.shared.sim_now,
            {
		resource_id: images.lookup("player/zxL1T.png"),
            },
            {
		resource_id: images.lookup("player/zxR1T.png"),
            },
	);
    }
    }
}

function get_player_acc_x(player: S.Player, db: GDB.GameDB): number {
    const commands = db.local.client_db.inputs.commands;
    let x: number = 0;
    if (commands != null) {
        // match: if the PLAYER_DELTA_*_ACC changes then likely
        // the gameport code in window.ts will need adjustment.
	if (!!commands[Cmd.CommandType.thrust]) { x += F.f2x(player.facing) * K.PLAYER_DELTA_X_ACC; }
        else if (!!commands[Cmd.CommandType.left]) { x -= K.PLAYER_DELTA_X_ACC; }
	else if (!!commands[Cmd.CommandType.right]) { x += K.PLAYER_DELTA_X_ACC; }
        // debugging printout.
        // if (Object.values(commands).filter(e => !!e).length > 0) {
        //     D.log(x, y, commands);
        // }
    }
    // eh, whatever, not 'normalizing' diagonal movment,
    // that is currently managed via the DELTA_{X,Y} values.
    return x;
}

// todo: mapping of multiple players to individual control sets.
function get_player_vel_y(_player: S.Player, db: GDB.GameDB): number {
    const commands = db.local.client_db.inputs.commands;
    let y: number = 0;
    if (commands != null) {
        if (!!commands[Cmd.CommandType.up]) { y -= K.PLAYER_DELTA_Y_VEL; }
        if (!!commands[Cmd.CommandType.down]) { y += K.PLAYER_DELTA_Y_VEL; }
        // debugging printout.
        // if (Object.values(commands).filter(e => !!e).length > 0) {
        //     D.log(x, y, commands);
        // }
    }
    // eh, whatever, not 'normalizing' diagonal movment,
    // that is currently managed via the DELTA_{X,Y} values.
    return y;
}

export function add_shield(db: GDB.GameDB, player: S.Player) {
    const images = db.uncloned.images;
    Sh.add_fighter_shield(db, {
        resource_id: images.lookup("shield/shield1.png"),
        enlarge: G.v2d_mk(1.5, 1.8),
        fighter: player,
        hp_init: K.PLAYER_HP,
        damage: K.PLAYER_HP,
        comment: `player-shield-${player.dbid}`,
        ignores: new Map([
            [C.CMask.people, C.Reaction.ignore],
            [C.CMask.base, C.Reaction.ignore],
            [C.CMask.gem, C.Reaction.fx],
	    [C.CMask.enemy_bounce, C.Reaction.bounce],
        ]),
        in_cmask: C.CMask.player,
        // C.CMask.people & C.CMask.base are to allow for teleporting.
        from_cmask: C.CMask.enemy | C.CMask.enemy_bounce | C.CMask.enemyShot | C.CMask.gem | C.CMask.people | C.CMask.base,
        on_collide(thiz: S.Shield<S.Player>, db: GDB.GameDB, c: S.CollidableSprite, reaction: C.Reaction) {
            if (U.has_bits_eq(c.type_flags, Tf.TF.gem)) {
                thiz.hp = Math.min(thiz.hp_init, thiz.hp + K.GEM_HP_BONUS);
                db.shared.sfx.push({ sfx_id: K.GEM_COLLECT_SFX });
            }
            // note: the player has an extra hard-coded ability to crash through enemies somewhat.
	    if (reaction === C.Reaction.hp && U.has_bits_eq(c.type_flags, Tf.TF.enemyShield)) {
                c.hp -= c.hp;
            }
        }            
    });
}
