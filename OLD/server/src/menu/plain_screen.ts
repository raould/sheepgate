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
import { RGBA } from '../color';

// todo: support size, like InstructionsScreen.
export interface PlainScreenSpec {
    title: string,
    skip_text: string,
    user_skip_after_msec?: number, // default is 0.
    instructions: string[],
    instructions_size: number;
    fg_color: RGBA,
    bg_color: RGBA,
}

export class PlainScreen implements M.Menu {
    bg_color: RGBA;
    mdb: MDB.MenuDB;
    state: Gs.StepperState;
    user_skip_after_msec: number;
    
    constructor(spec: PlainScreenSpec) {
	this.bg_color = spec.bg_color;
	this.user_skip_after_msec = K.user_wait_msec(spec.user_skip_after_msec ?? 0);
        this.mdb = MDB.menudb_mk(this.bg_color);

        this.add_text(
	    spec.title,
	    spec.fg_color,
	    G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.2),
	    K.d2si(60)
	);
        this.add_text(
	    spec.skip_text, 
	    spec.fg_color,
	    G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.9),
	    K.d2si(40)
	);

	const line_height = spec.instructions_size + K.d2si(5);
	const iyoff = line_height * spec.instructions.length / 2;
	const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.5 - iyoff);
        spec.instructions.forEach((text: string, index: number) => {
            const v_offset = line_height * index;
            this.add_text(
                text,
		spec.fg_color,
                G.v2d_add(center, G.v2d_mk_0y(v_offset)),
                spec.instructions_size,
            );
        });
        this.state = Gs.StepperState.running;
    }

    add_text(text: string, color: RGBA, center: G.V2D, size: number) {
        const measure = Tx.measure_text(text, size);
        const h_offset = -1 * measure.x/2;
        const t: Dr.DrawText = {
            lb: G.v2d_add(center, G.v2d_mk_x0(h_offset)),
            text,
            font: `${size}px ${K.MENU_FONT}`, // match: offset (hack).
            fillStyle: color,
            wrap: false,
        };
        this.mdb.shared.frame_drawing.texts.push(t);
    }

    merge_client_db(cdb2: Cdb.ClientDB): void {
        if (this.mdb.shared.sim_now > this.user_skip_after_msec && !!cdb2.inputs.commands[Cmd.CommandType.fire]) {
            this.state = Gs.StepperState.completed;
        }
    }

    get_state() {
        return this.state;
    }

    step() {
	MDB.next_frame(this.mdb);
    }

    // the menu db api is bad news.

    get_db(): Db.DB<Db.World> {
	return this.mdb.shared;
    }

    stringify(): string {
	return U.stringify(this.mdb.shared);
    }
}
