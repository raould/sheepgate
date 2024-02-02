import * as M from './menu';
import * as MDB from './menu_db';
import * as Cdb from '../client_db';
import * as Gs from '../game_stepper';
import * as G from '../geom';
import * as K from '../konfig';
import * as U from '../util/util';
import * as Tx from '../util/text';
import * as Dr from '../drawing';
import * as Cmd from '../commands';
import * as Rnd from '../random';
import { RGBA, HCycle } from '../color';

export const MESSAGE_MESC = 350;
export const USER_SKIP_AFTER_MSEC = 250;

export abstract class SizzlerScreen implements M.Menu {
    mdb: MDB.MenuDB;
    state: Gs.StepperState;
    elapsed: number;
    header_cycle: HCycle;
    body_cycle: HCycle;

    constructor(
        private readonly title: string,
        private readonly skip_text: U.O<string>,
        readonly bg_color: RGBA,
        private readonly animated: boolean = true
    ) {
        this.mdb = {
            world: {
                screen: K.SCREEN_RECT,
                bounds0: K.SCREEN_RECT.size,
            },
            bg_color: bg_color,
            frame_drawing: Dr.drawing_mk(),
            debug_graphics: [],
            images: {},
            frame_dt: K.DT,
        };
        this.state = Gs.StepperState.running;
        this.header_cycle = HCycle.newFromRed(90 / this.mdb.frame_dt);
        this.body_cycle = new HCycle(this.header_cycle.hsv, 180 / this.mdb.frame_dt);
        this.elapsed = 0;
    }

    merge_client_db(cdb2: Cdb.ClientDB): void {
        if (this.skip_text != null && this.elapsed > USER_SKIP_AFTER_MSEC && !!cdb2.inputs.commands[Cmd.CommandType.fire]) {
            this.state = Gs.StepperState.completed;
        }
    }

    get_state() {
        return this.state;
    }

    step() {
        this.elapsed += this.mdb.frame_dt;
        this.mdb.frame_drawing = Dr.drawing_mk();
        this.header_cycle.next();
        this.body_cycle.next();
        this.step_border();
        this.step_title();
        this.step_user_skip();
    }

    step_string(text: string, delay_msec: number = 0): string {
        if (this.animated) {
            return Tx.rez_text(text, this.elapsed / (MESSAGE_MESC + delay_msec));
        }
        else {
            return text;
        }
    }

    step_text(text: string, center: G.V2D, size: number, hcycle: HCycle, delay_msec: number = 0) {
        const sub = this.step_string(text);
        const measure = Tx.measure_text(sub, size);
        const h_offset = -1 * measure.x/2;
        const t: Dr.DrawText = {
            lb: G.v2d_add(center, G.v2d_mk_x0(h_offset)),
            text: sub,
            font: `${size}px ${K.MENU_FONT}`, // match: offset (hack).
            fillStyle: hcycle.current(),
            wrap: false,
        };
        this.mdb.frame_drawing.texts.push(t);
    }

    step_title() {
        const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.2);
        this.step_text(this.title, center, 60, this.header_cycle)
    }

    step_user_skip() {
        if (this.skip_text != null && (!this.animated || this.elapsed > USER_SKIP_AFTER_MSEC)) {
            const center = G.v2d_mk(this.mdb.world.bounds0.x * 0.5, this.mdb.world.bounds0.y * 0.9);
            this.step_text(this.skip_text, center, 40, this.header_cycle);
        }
    }

    step_border() {
        this.mdb.frame_drawing.rects.push(
            {
                wrap: false,
                color: this.header_cycle.current(),
                line_width: 4,
                rect: G.rect_inset(this.mdb.world.screen, G.v2d_mk_nn(10)),
            }
        );
        const rnd_inner = new Rnd.RandomImpl(this.elapsed);
        Dr.addSizzlerRect(
            this.mdb.frame_drawing,
            {
                wrap: false,
                color: this.header_cycle.current().setAlpha01(0.7),
                line_width: 2,
                rect: G.rect_inset(this.mdb.world.screen, G.v2d_mk_nn(25)),
            },
            50, 1.5, rnd_inner
        );
    }

    step_instructions(center: G.V2D, instructions: string[], size: number) {
        const hcycle = HCycle.newFromHCycle(this.body_cycle);
        instructions.forEach((text: string, index: number) => {
            const v_offset = (size+5) * index;
            this.step_text(
                text,
                G.v2d_add(center, G.v2d_mk_0y(v_offset)),
                size,
                hcycle
            );
            hcycle.skip(-45);
        });
    }

    stringify(): string {
        return MDB.stringify(this.mdb);
    }
}
