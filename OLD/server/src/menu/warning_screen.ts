/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as P from './plain_screen';
import { RGBA } from '../color';

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
