import * as K from '../konfig';
import * as Is from '../menu/instructions_screen';

const KCART1_SFX = { sfx_id: K.KCART1_SFX, gain: 0.3, singleton: true };

export class LevelEndScreen extends Is.InstructionsScreen {
    constructor(spec: Is.InstructionsScreenSpec) {
	super(spec);
	this.mdb.items.sfx.push({ sfx_id: K.SYNTH_A_SFX });
    }

    step() {
	super.step();
	this.mdb.items.sfx.push(KCART1_SFX);
    }
}
