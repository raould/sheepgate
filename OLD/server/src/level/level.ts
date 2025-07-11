/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Db from '../db';
import * as GDB from '../game_db';
import * as MDB from '../menu/menu_db';
import * as Cdb from '../client_db';
import * as Gs from '../game_stepper';
import * as K from '../konfig';
import * as Cmd from '../commands';
import * as G from '../geom';
import * as Gr from '../geom_rnd';
import * as S from '../sprite';
import * as Sc from '../scoring';
import * as Hs from '../high_scores';
import * as C from '../collision';
import * as Rnd from '../random';
import * as Dr from '../drawing';
import { RGBA } from '../color';
import * as U from '../util/util';
import * as Vp from '../gameport';
import * as Rdr from '../radar';
import * as D from '../debug';
import { DebugGraphics } from '../debug_graphics';
import * as _ from 'lodash';

// generic stuff to "step" a level.
// see: level_type_a.ts for the actual gameplay.

export interface Level extends Gs.Stepper {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;
    // todo:
    // ideally THIS db stuff NEEDS TO BE SPLIT UP INTO
    // inter-level data (ie konfig) vs. intra-level data.
    db: GDB.GameDB;

    get_starting_fx(): (mdb: MDB.MenuDB) => void;

    // todo: these are clearly indicments.
    get_scoring(): Sc.Scoring;
    get_lives(): number;
    lose_life(): void;
}

export abstract class AbstractLevel implements Level {

    abstract small_snapshot: S.ImageSized;
    abstract mega_snapshot: S.ImageSized;
    abstract hypermega_snapshot: S.ImageSized;
    abstract db: GDB.GameDB;
    abstract high_score: Hs.HighScore;
    
    abstract get_state(): Gs.StepperState;
    abstract update_impl(next: GDB.GameDB): void;
    abstract get_scoring(): Sc.Scoring;
    abstract get_lives(): number;

    get_db(): Db.DB<Db.World> {
	return this.db.shared;
    }

    stringify(): string {
        return GDB.stringify(this.db);
    }

    abstract lose_life(): void;

    private is_player_alive(next: GDB.GameDB): boolean {
	const p = GDB.get_player(next);
	return U.exists(p) && p.get_lifecycle(next) === GDB.Lifecycle.alive;
    }

    protected get_is_player_dying(next: GDB.GameDB): boolean {
	return !this.is_player_alive(next) &&
	    U.count_dict(next.shared.items.player_explosions) > 0;
    }

    merge_client_db(cdb2: Cdb.ClientDB) {
        const cdb = this.db.local.client_db;
        if (cdb == null || cdb.client_id == K.INVALID_CLIENT_ID) {
            this.db.local.client_db = cdb2;
        }
        else if (cdb.client_id === cdb2.client_id) {
            Object.values(Cmd.CommandSpecs).forEach(
                (s: Cmd.CommandSpec) => {
                    if (s.is_singular) { // wtf? this seems backwards to me now.
                        cdb.inputs.commands[s.command] =
                        !!cdb.inputs.commands[s.command] ||
                        !!cdb2.inputs.commands[s.command];
                    }
                    else {
                        cdb.inputs.commands[s.command] =
                        !!cdb2.inputs.commands[s.command];
                    }
                }
            );
            cdb.debugging_state = cdb2.debugging_state;
        }
        if (!!cdb2.inputs.commands[Cmd.CommandType.debug_dump_state]) {
            this.debug_dump();
        }
    }

    private debug_dump() {
        try {
            const jdb = JSON.stringify(this.db);
	    console.error(jdb);
        }
        catch (err) {
            D.log(`ERROR: debug_dump() failed. ${err}`);
        }
    }

    get_starting_fx(): (mdb: MDB.MenuDB) => void {
	return () => {};
    }

    step() {
        if (!this.is_paused(this.db)) {
            const next = this.db_init_next(this.db);
            DebugGraphics.reset(next);
            this.step_next(next);
            DebugGraphics.add_bounds(DebugGraphics.get_frame(), next);
            this.db = next;
        }
    }

    private step_next(next: GDB.GameDB) {
        // todo: updates should not mutate things
        // in the db on the fly. instead, generate
        // upate events which then get processed
        // en masse at the end of a simulation step.

        // here on down, match: DBSharedItems.
        // todo: is there any useful abstraction
        // for things that can be stepped?
        // a problem is that things need to be
        // done in certain orders anyway, i think,
        // to keep the behaviour really right!

	// todo: player lives would be better decremented via an event?
	const was_alive = this.is_player_alive(next);

        // update old shots before players add new ones
        // so that we do not also move the new ones an extra first time.
        was_alive && this.update_shots(next);

        // todo: decide what the right ordering is here;
        // when should these things be using the previous
        // frame vs. the currently updating frame?!!!
        // todo: be warned that the ordering is fragile
        // e.g. the update_impl() deciding won/lost.

        was_alive && this.update_generators(next);
        this.update_player(next);
        was_alive && this.update_people(next);
        this.update_explosions(next);
        this.update_viewport(next);
        was_alive && this.update_gems(next);
        was_alive && this.update_warpins(next);
        was_alive && this.update_enemies(next);
	was_alive && this.update_munchies(next)
        was_alive && this.update_sky(next);
        was_alive && this.update_ground(next);
        was_alive && this.update_bg(next);

        this.update_collisions(next);

        // update shields after the things they
        // wrap are updated, including via collisions,
        // because the shields need to "bisync".
        this.update_shields(next);

        this.update_fx(next);

        this.reap(next);

        // in case things went really wrong, which they have in the past.
        GDB.assert_dbitems(next);

        // todo: be warned that the ordering is fragile
        // the update_impl() deciding won/lost
        // has to be based on all the preceeding update calls above.
        this.update_impl(next);

	this.update_toasts(next);
        this.update_hud(next);
        this.update_screen_shake(next);
        next.shared.debug_graphics = DebugGraphics.get_graphics();
        this.clear_single_shot_commands(next);
    }

    private move_shots(next: GDB.GameDB) {
        Object.values(next.shared.items.shots).forEach(s => {
            s.step(next);
        });
    }

    private add_player_shots(next: GDB.GameDB) {
        // todo: ugh this should just be handled inside p.step() instead, probably.
        // but has to be done at the right time wrt e.g. move_shots()?
        // todo: support more inputs for each player, to each weapon.
        if (!!next.local.client_db.inputs.commands[Cmd.CommandType.fire]) {
            U.if_let(
                GDB.get_player(next),
                p => p.maybe_shoot(next)
            );
        }
    }

    private update_shots(next: GDB.GameDB) {
        this.move_shots(next);
        // enemies make shots during their step().
        // todo: maybe players should, too instead?
        this.add_player_shots(next);
    }

    private update_generators(next: GDB.GameDB) {
        Object.values(next.local.ticking_generators).forEach(g => g.step(next));
        Object.values(next.local.enemy_generators).forEach(g => g.step(next));
    }

    private update_player(next: GDB.GameDB) {
        U.if_let(
            GDB.get_player(next),
            player => {
                player.step(next);
                D.assert(GDB.is_in_bounds(next, player), player.comment);
            }
        );
        U.if_let(
            GDB.get_player_shadow(next),
	    shadow => {
                shadow.step(next);
            }
        );
    }

    private update_people(next: GDB.GameDB) {
        Object.values(next.shared.items.people).forEach(p => {
            p.step(next);
            D.assert(GDB.is_in_bounds(next, p), p.comment);
        });
    }

    private update_gems(next: GDB.GameDB) {
        Object.values(next.shared.items.gems).forEach(g => {
            g.step(next);
            D.assert(GDB.is_in_bounds(next, g), g.comment);
        });
    }

    private update_viewport(next: GDB.GameDB) {
        Vp.gameport_step(next);
    }

    private update_warpins(next: GDB.GameDB) {
        Object.values(next.shared.items.warpin).forEach(w => {
            w.step(next);
            D.assert(GDB.is_in_bounds(next, w), w.comment);
        });
    }

    private update_enemies(next: GDB.GameDB) {
        Object.values(next.shared.items.enemies).forEach(e => {
            e.step(next);
            D.assert(GDB.is_in_bounds(next, e), e.comment);
        });
    }

    private update_munchies(next: GDB.GameDB) {
        Object.values(next.shared.items.munchies).forEach(m => {
            m.step(next);
            D.assert(GDB.is_in_bounds(next, m), m.comment);
        });
    }

    private update_explosions(next: GDB.GameDB) {
        Object.values(next.shared.items.explosions).forEach(x => x.step(next));
        Object.values(next.shared.items.player_explosions).forEach(x => x.step(next));
    }

    private update_sky(next: GDB.GameDB) {
        Object.values(next.shared.items.sky).forEach(s => {
            s.step(next);
            D.assert(GDB.is_in_bounds(next, s), s.comment);
        });
    }

    private update_ground(next: GDB.GameDB) {
        Object.values(next.shared.items.ground).forEach(g => g.step(next));
        next.shared.items.base.step(next);
    }

    private update_bg(next: GDB.GameDB) {
        Object.values(next.shared.items.bgFar).forEach(bg => bg.step(next));
        Object.values(next.shared.items.bgNear).forEach(bg => bg.step(next));
    }

    private update_fx(next: GDB.GameDB) {
        Object.values(next.shared.items.fx).forEach(x => x.step(next));
    }

    private update_collisions(next: GDB.GameDB) {
        next.uncloned.collision.clear();
        // match: GDB.GameDB.shared.items.
        const collections = [
            next.shared.items.shields,
            next.shared.items.shots,
            next.shared.items.people,
            next.shared.items.gems,
        ];
        collections.forEach(
            (c: U.Dict<S.Sprite & S.CollidableSprite>) => {
                Object.values(c).forEach(
                    (s: S.Sprite & S.CollidableSprite) => {
                        // alpha == 0 means the item is hidden from the world.
                        if (s.alpha > 0) {
                            next.uncloned.collision.add(s)
                        }
                    }
                );
            }
        );
        const r: C.Reports = next.uncloned.collision.get_reports();
        r.forEach((dsts: Set<S.CollidableSprite>, src: S.CollidableSprite) => {
            if (src != null && dsts != null && dsts.size > 0) {
		console.log(src.comment, [...dsts].map(d=>d.comment));
                src.collide(next, dsts);
            }
        });
    }

    private update_shields(next: GDB.GameDB) {
        Object.values(next.shared.items.shields).forEach(s => s.step(next));
    }

    private reap(next: GDB.GameDB) {
        GDB.reap_local(next);
        GDB.reap_items(next);
        GDB.reap_particles(next);
    }

    private clear_single_shot_commands(next: GDB.GameDB) {
        const commands = next.local.client_db.inputs.commands;
        Object.values(Cmd.CommandSpecs).forEach(
            (s: Cmd.CommandSpec) => {
                if (s.is_singular) {
                    delete commands[s.command];
                }
            }
        );
    }

    private is_paused(db: GDB.GameDB): boolean {
        return db.local.client_db.debugging_state.is_stepping &&
            !!!db.local.client_db.inputs.commands[Cmd.CommandType.debug_step_frame];
    }

    private db_init_next(prev: GDB.GameDB): GDB.GameDB {
        const next = this.db_init_next_prev(prev);
        this.db_init_next_time(next);
        return next;
    }

    private db_init_next_prev(prev: GDB.GameDB): GDB.GameDB {
        // avoid overkill cloneDeep()ing the prev_db, we only need 1 step of history.
        prev.local.prev_db = {} as GDB.GameDB;
        prev.shared.hud_drawing = Dr.drawing_mk();
        prev.shared.frame_drawing = Dr.drawing_mk();
        prev.shared.sfx = [];
        // todo: !!! optimize/avoid this cloning somehow !!!
        const next_local: GDB.DBLocal = _.cloneDeep(prev.local);
        const next_shared: GDB.DBShared = _.cloneDeep(prev.shared);
        const next = {
            uncloned: prev.uncloned,
            local: next_local,
            shared: next_shared
        };
        next.local.prev_db = prev;
        return next;
    }

    private db_init_next_time(next: GDB.GameDB) {        
        // time, fps. supports single stepping debug mode.
        next.shared.tick = next.local.prev_db.shared.tick + 1;

        // smoothing statistics over about once per second.
        const now = Date.now();
        const dt = now - next.local.fps_marker.msec;
        if (dt >= 1000) {
            next.shared.fps = (next.shared.tick - next.local.fps_marker.tick) * 1000 / dt;
            next.local.fps_marker.msec = now;
            next.local.fps_marker.tick = next.shared.tick;
        }

        // time, stepping the simulation, if it is not paused.
        next.local.frame_dt = this.is_paused(next) ? 0 : K.FRAME_MSEC_DT;
        next.shared.sim_now += next.local.frame_dt;
        GDB.assert_dbitems(next);
    }

    // todo: a lot of these update_x() routines could be moved out to other files to clean up here.

    private update_toasts(next: GDB.GameDB) {
	Object.values(next.local.toasts).forEach(toast => {
	    next.shared.frame_drawing.texts.push(
		toast.to_drawing()
	    );
	    toast.step(next);
	});
    }

    protected update_hud(next: GDB.GameDB) {
        this.clear_hud(next);
	// painter's algorithm.
	this.update_alerts(next);
        Rdr.step(next);
        this.update_hud_right(next);
        this.update_hud_left(next);
    }

    private clear_hud(next: GDB.GameDB) {
        next.shared.hud_drawing.rects.push({
            wrap: false,
            line_width: 0,
            color: K.HUD_FILL_COLOR,
            is_filled: true,
            rect: K.HUDPORT_RECT,
        });
        next.shared.hud_drawing.rects.push({
            wrap: false,
            line_width: K.HUD_OUTLINE_WIDTH,
            color: K.HUD_OUTLINE_COLOR,
            is_filled: false,
            rect: K.HUD_VISIBLE_RECT,
        });
        // match: radar has to draw on top appropriately.
    }

    private add_hud_text(next: GDB.GameDB, side_lt: G.V2D, text: string, y: number) {
        const lb = G.v2d_add(
            side_lt,
            G.v2d_mk(10, y) // yes hard coded eyeballed.
        );
        const t: Dr.DrawText = {
            lb: lb,
            text: text,
            font: K.HUD_MESSAGE_FONT,
            fillStyle: RGBA.WHITE,
            wrap: false,
        };
        next.shared.hud_drawing.texts.push(t);
    }    

    private add_hud_left_text(next: GDB.GameDB, text: string, y: number) {
	this.add_hud_text(next, next.local.hud.left.lt, text, y);
    }    

    private add_hud_right_text(next: GDB.GameDB, text: string, y: number) {
	this.add_hud_text(next, next.local.hud.right.lt, text, y);
    }    

    private update_hud_right(next: GDB.GameDB) {
	const lives = "   #".repeat(next.shared.player_lives-1);
	this.add_hud_right_text(next, `LIVES: ${lives}`, 20);
        next.local.scoring.step(next);
	this.add_hud_right_text(next, `SCORE: ${next.local.scoring.score}`, 40);
        const hi_text = Math.floor(next.shared.sim_now / 3000) % 2 == 0 ?
              String(this.high_score.score) : this.high_score.callsign;
	this.add_hud_right_text(next, `HIGH: ${hi_text}`, 60);
    }

    private update_hud_left(next: GDB.GameDB) {
        const more_enemies =
	      U.count_dict(next.local.enemy_generators) > 0 ||
              U.count_dict(next.shared.items.enemies) > 0;
        const carrying = GDB.get_beaming_count(next);
        const more_people = U.count_dict(next.shared.items.people) > 0;

        if (more_enemies) {
            this.add_hud_left_text(next, "DEFEAT ALL ENEMIES", 20);
        }
        if (carrying) {
            this.add_hud_left_text(next, "DROP PERSON AT BASE", 60);
        }
        else if (more_people) {
            this.add_hud_left_text(next, "PICK UP A PERSON", 60);
        }
    }

    protected update_alerts(next: GDB.GameDB) {
	this.update_health_alert(next);
    }

    private update_health_alert(next: GDB.GameDB) {
        U.if_let(
            GDB.get_player(next),
            player => {
		if (U.exists(player.shield_id)) {
		    U.if_let(
			GDB.get_shield(next, player.shield_id),
			shield => {
			    const hpt = shield.hp / shield.hp_init;
			    if (hpt < K.DANGER_HPT_THRESHOLD) {
				const color: RGBA = K.DANGER_COLOR;
				next.shared.hud_drawing.rects.push({
				    wrap: false,
				    line_width: 0,
				    color,
				    is_filled: true,
				    rect: K.DANGER_LEFT_RECT,
				});
				next.shared.hud_drawing.rects.push({
				    wrap: false,
				    line_width: 0,
				    color,
				    is_filled: true,
				    rect: K.DANGER_RIGHT_RECT,
				});
				next.shared.hud_drawing.images.push(
				    K.DANGER_IMAGE_LOCATED
				);
			    }
			});
		}
	    });
    }

    private update_screen_shake(next: GDB.GameDB) {
        // shake is an evil globalish value for the client to globally use
        // to make some global drawing adjustment effects (globally).
        // (todo: this should ideally fade as the explosion fades,
        // which means the explosion needs to expose some timing,
        // or the explosions needs to be the ones to apply the shake?)
	const hm = Object.values(next.shared.items.explosions).some((e) => {
	    return e.rank >= S.Rank.hypermega;
	});
	const p = U.count_dict(next.shared.items.player_explosions) > 0;
        if (hm || p) {
            next.shared.screen_shake = Gr.v2d_random_inxy(Rnd.singleton, K.GAMEPORT_SHAKE, K.GAMEPORT_SHAKE);
        }
        else {
            next.shared.screen_shake = G.v2d_mk_0();
        }
    }
}
