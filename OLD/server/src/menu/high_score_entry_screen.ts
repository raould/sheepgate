import * as Sz from './sizzler_screen';
import * as Hs from '../high_scores';
import * as Cdb from '../client_db';
import * as Gs from '../game_stepper';
import * as G from '../geom';
import * as K from '../konfig';
import * as Rnd from '../random';
import * as Dr from '../drawing';
import * as Tx from '../util/text';
import * as Cmd from '../commands';
import * as U from '../util/util';
import { RGBA, HCycle } from '../color';
import * as D from '../debug';

// todo: left as a fun fun exercise for the reader to imagine
// doing this in an OO style rather than this oldschool procedural way.

const MAX_LETTERS = 8;
const SYMBOL_GRID = (() => {
    const row1 = U.range_cc(65, 77);
    const row2 = U.range_cc(78, 90);
    const row3 = [...U.range_cc(48, 57), 35];
    return [
        String.fromCharCode(...row1).split(''),
        String.fromCharCode(...row2).split(''),
        String.fromCharCode(...row3).split(''),
        // match: a lot of things depend on these
        // being the bottom row, and being 3 letters each.
        ["SPC", "DEL", "END"]
    ]
})();
const ACTION_ROW = SYMBOL_GRID.length-1;
const SPC_RC = G.v2d_mk(0, ACTION_ROW);
const DEL_RC = G.v2d_mk(1, ACTION_ROW);
const END_RC = G.v2d_mk(2, ACTION_ROW);
const CURSOR_PAD = G.v2d_mk(5, 9);
const SYMBOL_RECT_SIZE = G.v2d_mk(15, 25);
const SYMBOL_SIZE = 40;
const SYMBOL_H_SPACING = 30;
const SYMBOL_V_SPACING = 14;
const CALLSIGN_SIZE = 70;
const INSTRUCTIONS_SIZE = 25;

const INSTRUCTIONS = [
    "YOUR NAME GONNA BE IN LIGHTS.",
    "USE THE CURSOR TO SELECT YOUR",
    `CALL SIGN, MAX ${MAX_LETTERS} ASCII.`,
];

export class HighScoreEntryScreen extends Sz.SizzlerScreen {
    letters: string;
    cursor: G.V2D;
    rects: G.Rect[][];

    constructor(private readonly score: number) {
        super("HIGH SCORE!", undefined, RGBA.DARK_BLUE);
        this.letters = "";
        this.cursor = G.v2d_mk_0();
        this.rects = [];
        this.init_rects();
    }

    get_entry(): Hs.HighScore {
        return new Hs.HighScore(this.letters, this.score);
    }

    init_rects() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.65);
        SYMBOL_GRID.forEach((row: string[], rindex: number) => {
            const row_rects: G.Rect[] = [];
            this.rects.push(row_rects);
            const measure = Tx.measure_text(row.join(''), SYMBOL_SIZE);
            const width = measure.x + (row.length-1) * SYMBOL_H_SPACING;
            const left = center.x - width / 2;
            const x_step = measure.x / row.length + SYMBOL_H_SPACING;
            row.forEach((l: string, lindex: number) => {
                const h_offset = x_step * lindex;
                const v_offset = (measure.y + SYMBOL_V_SPACING) * rindex;
                let size = SYMBOL_RECT_SIZE;
                if (rindex == SPC_RC.y || rindex == DEL_RC.y || rindex == END_RC.y) {
                    size = G.v2d_scale_x(size, 3);
                }
                const rect = G.rect_mk_lb(
                    G.v2d_mk(left + h_offset, center.y + v_offset),
                    size
                );
                row_rects.push(rect);
            });
        });
    }

    merge_client_db(cdb2: Cdb.ClientDB): void {
        super.merge_client_db(cdb2);
        const commands = cdb2.inputs.commands;
        if (commands != null) {
            const x0 = this.cursor.x;
            const y0 = this.cursor.y;
            const mid0 = G.rect_mid(this.rects[y0][x0]);
            let x1 = x0;
            let y1 = y0;

            if (!!commands[Cmd.CommandType.left]) { x1 -= 1; }
            if (!!commands[Cmd.CommandType.right]) { x1 += 1; }            
            if (!!commands[Cmd.CommandType.up]) { y1 -= 1; }
            if (!!commands[Cmd.CommandType.down]) { y1 += 1; }

            y1 = U.clip(y1, 0, this.rects.length-1);
            if (y1 != y0) {
                const row1 = this.rects[y1];
                const dists1: [number, number][] = row1
                    .map((e, i) =>
                        [i, Math.abs(G.rect_mid(e).x - mid0.x)]
                    );
                x1 = dists1.sort((a, b) => a[1]-b[1])[0][0]; 
            }
            if (y1 == ACTION_ROW) {
                x1 = U.clip(x1, 0, this.rects[y1].length-1);
            }
            else {
                x1 = U.index_looped(this.rects[y1].length, x1);
            }
            this.cursor = G.v2d_mk(x1, y1);

            if (!!commands[Cmd.CommandType.fire]) {
                if (G.v2d_eq(this.cursor, SPC_RC)) {
                    if (this.letters.length < MAX_LETTERS) {
                        this.letters += " ";
                    }
                }
                else if (G.v2d_eq(this.cursor, DEL_RC)) {
                    this.letters = this.letters.substring(
                        0, Math.max(0, this.letters.length-1)
                    );
                }
                else if (G.v2d_eq(this.cursor, END_RC)) {
                    // todo: update some high score table somewhere!
                    this.state = Gs.StepperState.completed;
                }
                else if (this.letters.length < MAX_LETTERS) {
                    this.letters += (SYMBOL_GRID[this.cursor.y][this.cursor.x]);
                }
            }
        }
    }

    step() {
        super.step()
        this.step_instructions();
        this.step_input_symbols();
        this.step_input_cursor();
        this.step_callsign();
    }

    step_input_symbols() {
        SYMBOL_GRID.forEach((row: string[], rindex: number) => {
            row.forEach((l: string, lindex: number) => {
                const lb = G.rect_lb(this.rects[rindex][lindex]);
                const t: Dr.DrawText = {
                    lb: lb,
                    text: l,
                    font: `${SYMBOL_SIZE}px ${K.MENU_FONT}`, // match: offset (hack).
                    fillStyle: RGBA.GRAY,
                    wrap: false,
                };
                this.mdb.frame_drawing.texts.push(t);
            });
        });
    }

    step_input_cursor() {
        const rect = G.rect_pad_v2d(
            this.rects[this.cursor.y][this.cursor.x],
            CURSOR_PAD
        );
        this.mdb.frame_drawing.rects.push({
            rect: rect,
            line_width: Rnd.singleton.next_float_around(2, 1),
            color: RGBA.YELLOW.setAlpha01(Rnd.singleton.next_float_around(0.8, 0.2)),
            wrap: false
        });
    }

    step_callsign() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.55);
        const measure = Tx.measure_text(this.letters, CALLSIGN_SIZE);
        const h_offset = measure.x / 2;
        const t: Dr.DrawText = {
            lb: G.v2d_sub(center, G.v2d_mk_x0(h_offset)),
            text: this.letters,
            font: `${CALLSIGN_SIZE}px ${K.MENU_FONT}`, // match: offset (hack).
            fillStyle: RGBA.WHITE,
            wrap: false,
        };
        this.mdb.frame_drawing.texts.push(t);
    }

    step_instructions() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.27);
        super.step_instructions(center, INSTRUCTIONS, INSTRUCTIONS_SIZE);
    }
}