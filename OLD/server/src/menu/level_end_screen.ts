import * as K from '../konfig';
import * as Is from './instructions_screen';

export class LevelEndScreen extends Is.InstructionsScreen {
    constructor(spec: Is.InstructionsScreenSpec) {
	super(spec);
	this.mdb.items.sfx.push({ sfx_id: K.SYNTH_A_SFX });
    }
}
