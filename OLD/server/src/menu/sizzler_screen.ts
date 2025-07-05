/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as M from './menu';
import * as MDB from './menu_db';
import * as Cdb from '../client_db';
import * as Db from '../db';
import * as Gs from '../game_stepper';
import * as G from '../geom';
import * as K from '../konfig';
import * as U from '../util/util';
import * as Tx from '../util/text';
import * as Dr from '../drawing';
import * as Cmd from '../commands';
import * as Rnd from '../random';
import { RGBA, HCycle } from '../color';

export const MESSAGE_MESC = 500;

export interface SizzlerScreenSpec {
    sizzle?: boolean, // default is true.
    title?: string,
    skip_text?: string,
    user_skip_after_msec?: number, // default is 0.
    bg_color: RGBA,
    rez?: boolean, // default is true.
    timeout?: number, // default is never.
    hide_user_skip_msg?: boolean;
    ignore_user_skip?: boolean, // default is false.
}

export class SizzlerScreen implements M.Menu {
    sizzle: boolean;
    bg_color: RGBA;
    mdb: MDB.MenuDB;
    state: Gs.StepperState;
    timeout: U.O<number>;
    header_cycle: HCycle;
    body_cycle: HCycle;
    title?: string;
    skip_text: U.O<string>;
    user_skip_after_msec: number;
    hide_user_skip_msg: boolean;
    ignore_user_skip: boolean;
    rez: boolean;

    constructor(spec: SizzlerScreenSpec) {
	this.sizzle = spec.sizzle ?? true;
	this.bg_color = spec.bg_color;
	this.mdb = MDB.menudb_mk(this.bg_color);
	this.title = spec.title;
	this.skip_text = spec.skip_text;
	this.user_skip_after_msec = K.user_wait_msec(spec.user_skip_after_msec ?? 0);
	this.rez = spec.rez ?? true;
	this.timeout = spec.timeout;
	this.hide_user_skip_msg = spec.hide_user_skip_msg ?? false;
	this.ignore_user_skip = spec.ignore_user_skip ?? false;
        this.state = Gs.StepperState.running;
        this.header_cycle = HCycle.newFromRed(35 / this.mdb.frame_dt);
        this.body_cycle = new HCycle(this.header_cycle.hsv, 90 / this.mdb.frame_dt);
    }

    merge_client_db(cdb2: Cdb.ClientDB): void {
        if (this.ignore_user_skip !== true &&
	    this.mdb.shared.sim_now > this.user_skip_after_msec &&
	    !!cdb2.inputs.commands[Cmd.CommandType.fire]) {
            this.state = Gs.StepperState.completed;
        }
    }

    get_state() {
        return this.state;
    }

    step() {
	MDB.next_frame(this.mdb);
	if (U.exists(this.timeout)) { this.timeout -= this.mdb.frame_dt; }
	if (U.exists(this.timeout) && this.timeout <= 0) {
	    this.state = Gs.StepperState.completed;
	}
        this.mdb.shared.frame_drawing = Dr.drawing_mk();
        this.header_cycle.next();
        this.body_cycle.next();
        this.step_sizzlers();
        this.step_title();
        this.step_user_skip();
	this.step_timeout();
    }

    step_string(text: string, delay_msec: number = 0): string {
        if (this.rez) {
            return Tx.rez_text(text, this.mdb.shared.sim_now / (MESSAGE_MESC + delay_msec));
        }
        else {
            return text;
        }
    }

    step_text(text: string, center: G.V2D, size: number, hcycle: HCycle, delay_msec: number = 0) {
        const sub = this.step_string(text);
        const measure = Tx.measure_text(sub, size);
        const h_offset = -1 * measure.x/2;
        const t: Dr.DrawText = {
            lb: G.v2d_add(center, G.v2d_mk_x0(h_offset)),
            text: sub,
            font: `${size}px ${K.MENU_FONT}`, // match: offset (hack).
            fillStyle: hcycle.current(),
            wrap: false,
        };
        this.mdb.shared.frame_drawing.texts.push(t);
    }

    step_title() {
	if (U.exists(this.title)) {
            const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.2);
            this.step_text(this.title, center, K.d2si(60), this.header_cycle)
	}
    }

    step_user_skip() {
        if (!this.hide_user_skip_msg &&
	    U.exists(this.skip_text) &&
	    (!this.rez || this.mdb.shared.sim_now > this.user_skip_after_msec)) {
            const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.9);
            this.step_text(this.skip_text, center, K.d2si(40), this.header_cycle);
        }
    }

    step_timeout() {
        if (U.exists(this.timeout)) {
            const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.935, this.mdb.shared.world.bounds0.y * 0.15);
	    const msg = String(Math.ceil(this.timeout/1000));
            this.step_text(msg, center, K.d2si(25), this.header_cycle);
        }
    }

    step_sizzlers() {
	if (!this.sizzle) { return; }
        this.mdb.shared.frame_drawing.rects.push(
            {
                wrap: false,
                color: this.header_cycle.current(),
                line_width: K.d2si(4),
                rect: G.rect_inset(this.mdb.shared.world.screen, K.vd2si(G.v2d_mk_nn(10))),
            }
        );
        const rnd_inner = new Rnd.RandomImpl(this.mdb.shared.sim_now);
        Dr.addSizzlerRect(
	    this.mdb.shared.frame_drawing,
	    {
                wrap: false,
                color: this.header_cycle.current().setAlpha01(0.7),
                line_width: K.d2si(2),
                rect: G.rect_inset(this.mdb.shared.world.screen, K.vd2si(G.v2d_mk_nn(25))),
	    },
	    50, K.d2s(1.5), rnd_inner
        );
    }

    // the menu db api is bad news.

    get_db(): Db.DB<Db.World> {
	return this.mdb.shared;
    }

    stringify(): string {
        return U.stringify(this.mdb.shared);
    }
}
