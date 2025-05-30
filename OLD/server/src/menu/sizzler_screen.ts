/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as M from './menu';
import * as Mdb from './menu_db';
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
import * as D from '../debug';

export const MESSAGE_MESC = 350;

export interface SizzlerScreenSpec {
    title?: string,
    skip_text?: string,
    bg_color: RGBA,
    animated?: boolean, // default is true.
    timeout?: number, // default is never.
    hide_user_skip_msg?: boolean;
    ignore_user_skip?: boolean, // default is false.
}

export class SizzlerScreen implements M.Menu {
    bg_color: RGBA;
    mdb: Mdb.MenuDB;
    state: Gs.StepperState;
    elapsed: number;
    timeout: U.O<number>;
    header_cycle: HCycle;
    body_cycle: HCycle;
    title?: string;
    skip_text: U.O<string>;
    hide_user_skip_msg: boolean;
    ignore_user_skip: boolean;
    animated: boolean;

    constructor(spec: SizzlerScreenSpec) {
	this.bg_color = spec.bg_color;
	this.mdb = Mdb.menudb_mk(this.bg_color);
	this.title = spec.title;
	this.skip_text = spec.skip_text;
	this.animated = spec.animated ?? true;
	this.timeout = spec.timeout;
	this.hide_user_skip_msg = spec.hide_user_skip_msg ?? false;
	this.ignore_user_skip = spec.ignore_user_skip ?? false;
        this.state = Gs.StepperState.running;
        this.header_cycle = HCycle.newFromRed(90 / this.mdb.frame_dt);
        this.body_cycle = new HCycle(this.header_cycle.hsv, 180 / this.mdb.frame_dt);
        this.elapsed = 0;
    }

    merge_client_db(cdb2: Cdb.ClientDB): void {
        if (this.ignore_user_skip !== true &&
	    this.elapsed > K.USER_SKIP_AFTER_MSEC &&
	    !!cdb2.inputs.commands[Cmd.CommandType.fire]) {
            this.state = Gs.StepperState.completed;
        }
    }

    get_state() {
        return this.state;
    }

    step() {
        this.elapsed += this.mdb.frame_dt;
	if (U.exists(this.timeout)) { this.timeout -= this.mdb.frame_dt; }
	if (U.exists(this.timeout) && this.timeout <= 0) {
	    this.state = Gs.StepperState.completed;
	}
        this.mdb.shared.frame_drawing = Dr.drawing_mk();
        this.header_cycle.next();
        this.body_cycle.next();
        this.step_border();
        this.step_title();
        this.step_user_skip();
	this.step_timeout();
    }

    step_string(text: string, delay_msec: number = 0): string {
        if (this.animated) {
            return Tx.rez_text(text, this.elapsed / (MESSAGE_MESC + delay_msec));
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
            this.step_text(this.title, center, 60, this.header_cycle)
	}
    }

    step_user_skip() {
        if (!this.hide_user_skip_msg &&
	    U.exists(this.skip_text) &&
	    (!this.animated || this.elapsed > K.USER_SKIP_AFTER_MSEC)) {
            const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.9);
            this.step_text(this.skip_text, center, 40, this.header_cycle);
        }
    }

    step_timeout() {
        if (U.exists(this.timeout)) {
            const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.935, this.mdb.shared.world.bounds0.y * 0.15);
	    const msg = String(Math.ceil(this.timeout/1000));
            this.step_text(msg, center, 25, this.header_cycle);
        }
    }

    step_border() {
        this.mdb.shared.frame_drawing.rects.push(
            {
                wrap: false,
                color: this.header_cycle.current(),
                line_width: 4,
                rect: G.rect_inset(this.mdb.shared.world.screen, G.v2d_mk_nn(10)),
            }
        );
        const rnd_inner = new Rnd.RandomImpl(this.elapsed);
        Dr.addSizzlerRect(
            this.mdb.shared.frame_drawing,
            {
                wrap: false,
                color: this.header_cycle.current().setAlpha01(0.7),
                line_width: 2,
                rect: G.rect_inset(this.mdb.shared.world.screen, G.v2d_mk_nn(25)),
            },
            50, 1.5, rnd_inner
        );
    }

    get_db(): Db.DB<Db.World> {
	return this.mdb.shared;
    }

    stringify(): string {
        const str = U.stringify(this.mdb.shared);
	this.mdb = Mdb.menudb_mk(this.bg_color);
	return str;
    }
}
