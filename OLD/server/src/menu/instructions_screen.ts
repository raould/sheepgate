/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as K from '../konfig';
import * as Sz from './sizzler_screen';
import * as G from '../geom';
import { RGBA, HCycle } from '../color';

export interface InstructionsScreenSpec {
    title?: string,
    instructions: string[],
    size: number,
    animated: boolean,
    bg_color: RGBA;
    timeout?: number;
    // this is where it becomes a(n even) big(ger) ball of mud.
    top_offset_y?: number;
    hide_user_skip_msg?: boolean;
    ignore_user_skip?: boolean;
    user_skip_after_msec?: number, // default is 0.
}

export class InstructionsScreen extends Sz.SizzlerScreen {
    instructions: string[];
    top: G.V2D;
    line_height: number;
    size: number;

    constructor(spec: InstructionsScreenSpec) {
        super({
	    ...spec,
	    title: spec.title,
	    skip_text: spec.hide_user_skip_msg ? undefined : K.USER_SKIP_TEXT,
	});
	this.instructions = spec.instructions;
	this.size = spec.size;
	this.line_height = this.size * 1.05;
	const iyoff = this.line_height * this.instructions.length / 2;
	this.top = G.v2d_mk(
	    this.mdb.shared.world.bounds0.x * 0.5,
	    this.mdb.shared.world.bounds0.y * 0.5 - iyoff + (spec.top_offset_y ?? 0)
	);
    }

    step() {
        super.step();
        this.step_instructions();
    }

    step_instructions() {
        const hcycle = HCycle.newFromHCycle(this.body_cycle);
	this.instructions.forEach((line: string, index: number) => {
            const v_offset = this.line_height * index;
            this.step_text(
                line,
                G.v2d_add(this.top, G.v2d_mk_0y(v_offset)),
                this.size,
                hcycle
            );
            hcycle.skip(-22);
        });
    }
}
