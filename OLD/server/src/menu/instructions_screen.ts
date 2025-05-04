import * as Sz from './sizzler_screen';
import * as G from '../geom';
import { RGBA, HCycle } from '../color';

const INSTRUCTIONS_SIZE = 30;

export class InstructionsScreen extends Sz.SizzlerScreen {
    constructor(private readonly instructions: string[], animated: boolean) {
        super("HOW TO PLAY", "PRESS [FIRE] TO CONTINUE", RGBA.DARK_BLUE, animated);
    }

    step() {
        super.step()
        this.step_instructions()
    }

    step_instructions() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.32);
        super.step_instructions(center, this.instructions, INSTRUCTIONS_SIZE);
    }
}
