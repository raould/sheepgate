import * as K from '../konfig';
import * as Is from '../menu/instructions_screen';

const KCART1_SFX = { sfx_id: K.KCART1_SFX, gain: 0.3, singleton: true };

export class LevelEndScreen extends Is.InstructionsScreen {
    constructor(spec: Is.InstructionsScreenSpec) {
	super({ ...spec, timeout: spec.timeout ?? 10*1000 });
	this.mdb.shared.sfx.push({ sfx_id: K.SYNTH_A_SFX });
    }

    step() {
	super.step();
	this.mdb.shared.sfx.push(KCART1_SFX);
    }
}
