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
import { RGBA } from '../color';

// todo: support size, like InstructionsScreen.
export interface PlainScreenSpec {
    title: string,
    skip_text: string,
    instructions: string[],
    instructions_size: number;
    fg_color: RGBA,
    bg_color: RGBA,
}

export class PlainScreen implements M.Menu {
    bg_color: RGBA;
    mdb: Mdb.MenuDB;
    state: Gs.StepperState;
    elapsed: number;

    constructor(spec: PlainScreenSpec) {
	this.bg_color = spec.bg_color;
        this.mdb = Mdb.menudb_mk(this.bg_color);

        this.add_text(
	    spec.title,
	    spec.fg_color,
	    G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.2),
	    60
	);
        this.add_text(
	    spec.skip_text, 
	    spec.fg_color,
	    G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.9),
	    40
	);

	const line_height = spec.instructions_size + 5;
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
	this.elapsed = 0;
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
        if (this.elapsed > K.USER_SKIP_AFTER_MSEC &&
	    !!cdb2.inputs.commands[Cmd.CommandType.fire]) {
            this.state = Gs.StepperState.completed;
        }
    }

    get_state() {
        return this.state;
    }

    step() {
        this.elapsed += this.mdb.frame_dt;
    }

    get_db(): Db.DB<Db.World> {
	return this.mdb.shared;
    }

    stringify(): string {
	return U.stringify(this.mdb.shared);
    }
}
