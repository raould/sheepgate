import * as K from '../konfig';
import * as U from '../util/util';
import * as P from './plain_screen';
import * as G from '../geom';
import { RGBA, HCycle } from '../color';
import * as Rnd from '../random';

const INSTRUCTIONS_SIZE = 40;
const FG_COLOR = RGBA.WHITE;
const BG_COLOR = RGBA.DARK_RED;

export class WarningScreen extends P.PlainScreen {
    constructor(private readonly instructions: string[]) {
        super({
	    title: "WARNING",
	    skip_text: "CONTINUE: SPACE / Z / ENTER",
	    instructions: instructions,
	    instructions_size: INSTRUCTIONS_SIZE,
	    fg_color: FG_COLOR,
	    bg_color: BG_COLOR
	});
    }
}
