/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as K from '../konfig';
import * as Is from '../menu/instructions_screen';

const KCART1_SFX = { sfx_id: K.KCART1_SFX, gain: 0.3, singleton: true };

export class LevelEndScreen extends Is.InstructionsScreen {
    constructor(spec: Is.InstructionsScreenSpec) {
	super({
	    ...spec,
	    timeout: spec.timeout ?? 10*1000,
	    user_skip_after_msec: 1000,
	});
	this.mdb.shared.sfx.push({ sfx_id: K.SYNTH_A_SFX });
    }

    step() {
	super.step();
	this.mdb.shared.sfx.push(KCART1_SFX);
    }
}
