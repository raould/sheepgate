import * as S from './sprite';
import * as G from './geom';
import * as F from './facing';
import * as Ph from './phys';
import * as Pw from './player_weapon';
import * as Sh from './fighter_shield';
import * as C from './collision';
import * as Tf from './type_flags';
import * as Gr from './ground';
import * as Po from './people';
import * as A from './animation';
import * as U from './util/util';
import * as GDB from './game_db';
import * as Cmd from './commands';
import * as K from './konfig';
import * as Sc from './scoring';
import * as D from './debug';
import * as So from './sound';

const thrust_sfx: So.Sfx = {
    sfx_id: K.THRUST_SFX,
    gain: 0.2,
    singleton: true
};

export type PlayerSpec = {
    facing: F.Facing;
    lt: G.V2D;
}

interface PlayerSpritePrivate extends S.Player {
    lifecycle: GDB.Lifecycle;
    ship_anim: A.FacingResourceAnimator;
    flame_anim: A.FacingResourceAnimator;
    step_pos(db: GDB.GameDB, delta_acc_x: number, delta_vel_y: number): void;
    step_resource_id(db: GDB.GameDB, delta_acc_x: number): void;
}

export function player_mk(db: GDB.GameDB, dbid: GDB.DBID, spec: PlayerSpec): S.Player {
    const p: PlayerSpritePrivate = {
        ...spec,
        dbid: dbid,
        comment: `player-${dbid}`,
        lt: spec.lt,
        size: K.PLAYER_SIZE,
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        alpha: 1,
        rank: S.Rank.player,
        ship_anim: ship_anim_mk(db),
        flame_anim: flame_anim_mk(db),
        type_flags: Tf.TF.playerShip,
        weapons: weapons_mk(),
        passenger_max: 1,
        passenger_ids: new Set<GDB.DBID>(),
        beaming_ids: new Set<GDB.DBID>(),
        lifecycle: GDB.Lifecycle.alive,
        step(db: GDB.GameDB) {
            // regular physics movement for x, heuristic for y.
            // x should match: phys
            const delta_acc_x = get_player_acc_x(db);
            const delta_vel_y = get_player_vel_y(db);
            this.step_pos(db, delta_acc_x, delta_vel_y);
            this.step_resource_id(db, delta_acc_x);
	    if (delta_acc_x != 0) {
		db.shared.sfx.push(thrust_sfx);
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
            this.lt.y = Math.min(this.lt.y, max_y - this.size.y - 20);

             // 3) some buffer ie so that your sheild and hp bar don't go off-screen.
             // todo: make it dynamically calculated based on the hp bar position.
            this.lt.y = Math.max(this.lt.y, 25);
        },
        step_resource_id(db: GDB.GameDB, delta_acc_x: number) {
            const facing = F.facing_for_inputs(db.local.client_db.inputs);
            if (facing != null) { this.facing = facing; }
            this.z_back_to_front_ids = [];
            const is_thrusting = Math.abs(delta_acc_x) > Number.EPSILON;
            this.z_back_to_front_ids.push(
                ...this.ship_anim.z_back_to_front_ids(db, this.facing) || K.EMPTY_IMAGE_RESOURCE_ID
            );
            if (is_thrusting) {
                this.z_back_to_front_ids.push(
                    ...this.flame_anim.z_back_to_front_ids(db, this.facing) || K.EMPTY_IMAGE_RESOURCE_ID
                );
            }
        },
        set_lifecycle(lifecycle: GDB.Lifecycle) {
            this.lifecycle = lifecycle;
        },
        get_lifecycle(_:GDB.GameDB): GDB.Lifecycle {
            return this.lifecycle;
        },
        on_collide(db: GDB.GameDB, c: S.CollidableSprite): void {
            this.maybe_beam_up_person(db, c);
            this.maybe_beam_down_to_base(db, c);
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
                        db.shared.sfx.push({ sfx_id: K.PLAYER_SHOOT_SFX });
                    }
                })
            );
        },
        maybe_beam_up_person(db: GDB.GameDB, maybe_person: S.CollidableSprite) {
            const vel2 = G.v2d_len2(this.vel);
            if (vel2 <= K.PLAYER_BEAM_MAX_VEL2 &&                        
                U.has_bits_eq(maybe_person.type_flags, Tf.TF.person) &&
                this.passenger_ids.size < this.passenger_max) {
                const pid = maybe_person.dbid;
                U.if_let(
                    GDB.get_person(db, pid),
                    person => {
                        person.beam_up(db);
                        this.passenger_ids.add(person.dbid);
                    }
                );
            }
        },
        maybe_beam_down_to_base(db: GDB.GameDB, maybe_base_shield: S.CollidableSprite) {
            const vel2 = G.v2d_len2(this.vel);
            if (this.passenger_ids.size > 0 &&
                vel2 <= K.PLAYER_BEAM_MAX_VEL2 &&
                U.has_bits_eq(maybe_base_shield.type_flags, Tf.TF.baseShield)) {
                U.if_let(
                    GDB.get_shield(db, maybe_base_shield.dbid),
                    shield => {
                        const base = db.shared.items.base;
                        this.beaming_ids = this.passenger_ids;
                        this.passenger_ids = new Set<GDB.DBID>();
                        this.beaming_ids.forEach(pid => {
                            const s = GDB.add_sprite_dict_id_mut(
                                db.shared.items.fx,
                                (dbid: GDB.DBID): S.Sprite => Po.beaming_down_anim_mk(
                                    db,
                                    dbid,
                                    base.beam_down_rect,
                                    /*on_end*/(db: GDB.GameDB) => {
                                        U.if_let(
                                            GDB.get_player(db),
                                            (thiz: S.Player) => {
                                                thiz.beaming_ids.delete(pid);
                                                db.shared.rescued_count++;
                                                db.local.scoring.on_event(Sc.Event.rescue);
						if (this.shield_id != undefined) {
						    U.if_let(
							GDB.get_shield(db, this.shield_id),
							player_shield => {
							    player_shield.hp = K.PLAYER_HP;
							}
						    );
						}
                                            }
                                        );
                                    }
                                )
                            );
                            if (!!s) {
                                db.shared.sfx.push({ sfx_id: K.BEAMDOWN_SFX, gain: 0.35 });
                            }
                        });
                    }
                );
            }
        }
    }
    return p;
}

function weapons_mk(): { [k: string]: S.Weapon } {
    return {
        w1: Pw.player_weapon_mk({
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
            shot_size: K.PLAYER_SHOT_SIZE,
            shot_life_msec: K.PLAYER_SHOT_LIFE_MSEC,
            in_cmask: C.CMask.playerShot,
            from_cmask: C.CMask.enemy,
        })
    };
}

function ship_anim_mk(db: GDB.GameDB): A.FacingResourceAnimator {
    const images = db.uncloned.images;
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

function flame_anim_mk(db: GDB.GameDB): A.FacingResourceAnimator {
    const images = db.uncloned.images;
    return A.facing_animator_mk(
        db.shared.sim_now,
        {
            frame_msec: K.PLAYER_ANIM_FRAME_MSEC/2,
            resource_ids: images.lookup_range_a((a) => `player/p1_f${a}_left.png`, ['a', 'b', 'c']),
            starting_mode: A.MultiImageStartingMode.hold,
            ending_mode: A.MultiImageEndingMode.loop
        },
        {
            frame_msec: K.PLAYER_ANIM_FRAME_MSEC/2,
            resource_ids: images.lookup_range_a((a) => `player/p1_f${a}_right.png`, ['a', 'b', 'c']),
            starting_mode: A.MultiImageStartingMode.hold,
            ending_mode: A.MultiImageEndingMode.loop
        },
    );
}

function get_player_acc_x(db: GDB.GameDB): number {
    const commands = db.local.client_db.inputs.commands;
    let x: number = 0;
    if (commands != null) {
        // match: if the PLAYER_DELTA_*_ACC changes then likely
        // the gameport code in window.ts will need adjustment.
        if (!!commands[Cmd.CommandType.left]) { x -= K.PLAYER_DELTA_X_ACC; }
        if (!!commands[Cmd.CommandType.right]) { x += K.PLAYER_DELTA_X_ACC; }
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
function get_player_vel_y(db: GDB.GameDB): number {
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
        ]),
        in_cmask: C.CMask.player,
        // C.CMask.people & C.CMask.base are to allow for teleporting.
        from_cmask: C.CMask.enemy | C.CMask.enemyShot | C.CMask.gem | C.CMask.people | C.CMask.base,
        on_collide(thiz: S.Shield<S.Player>, db: GDB.GameDB, c: S.CollidableSprite, __: C.Reaction) {
            if (U.has_bits_eq(c.type_flags, Tf.TF.gem)) {
                thiz.hp = Math.min(thiz.hp_init, thiz.hp + K.GEM_HP_BONUS);
                db.shared.sfx.push({ sfx_id: K.GEM_COLLECT_SFX });
            }
            // note: the player has an extra hard-coded ability to crash through enemies somewhat.
            if (U.has_bits_eq(c.type_flags, Tf.TF.enemyShield)) {
                c.hp -= c.hp;
            }
        }            
    });
}
