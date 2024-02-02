import * as Sz from './sizzler_screen';
import * as G from '../geom';
import { RGBA, HCycle } from '../color';

    /*
    <p>Instructions</p>
    <p style="font-size: 10pt;">Return people by picking them up and returning them to the Base.<br>
    Defeat all enemies. Some enemies drop Energy Gems when defeated.<br>
    FIRE = SPACE or Z or ENTER<br>
    MOVE = {W,A,S,D} or {ARROW KEYS}<br>
    BOOST = SHIFT</p>
    */

export const TOP_INSTRUCTIONS = [
    "RETURN PEOPLE TO BASE.",
    "DEFEAT ALL ENEMIES.",
    "------",
    "CONTROLS:",
    "FIRE: SPACE / Z / ENTER",
    "MOVE: {W,A,S,D} / {ARROW KEYS}",
    "BOOST: SHIFT",
    "PAUSE: ESC",
];

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