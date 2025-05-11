import * as K from '../konfig';
import * as Sz from './sizzler_screen';
import * as G from '../geom';
import { RGBA, HCycle } from '../color';
import * as Rnd from '../random';

const INSTRUCTIONS_SIZE = 30;
const BG_COLOR = RGBA.new01(0, 0, 0.1);
const SFX = [K.SYNTH_A_SFX, K.SYNTH_B_SFX, K.SYNTH_C_SFX, K.SYNTH_D_SFX, K.SYNTH_E_SFX];

export class InstructionsScreen extends Sz.SizzlerScreen {
    constructor(private readonly instructions: string[], animated: boolean) {
        super({ title: "HOW TO PLAY", skip_text: "PRESS [FIRE] TO CONTINUE", bg_color: BG_COLOR, animated });
    }

    step() {
        super.step();
        this.step_instructions();
	if (Rnd.singleton.boolean(0.001)) {
	    const gain = Rnd.singleton.float_range(0.3, 0.7);
	    this.mdb.items.sfx.push({ id: K.SYNTH_A_SFX, gain });
	}
    }

    step_instructions() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.28);
        super.step_instructions(center, this.instructions, INSTRUCTIONS_SIZE);
    }
}
