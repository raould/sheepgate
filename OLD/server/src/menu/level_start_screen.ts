import * as Sz from './sizzler_screen';
import * as S from '../sprite';
import * as G from '../geom';
import * as K from '../konfig';
import * as Dr from '../drawing';
import { RGBA, HCycle } from '../color';

export class LevelStartScreen extends Sz.SizzlerScreen {
    constructor(title: string, skip_text: string, private readonly es: S.ImageSized, private readonly em: S.ImageSized, private readonly ehm: S.ImageSized, bg_color: RGBA) {
        super({ title, skip_text, bg_color, timeout: 10*1000 });
    }

    step() {
        super.step();
        this.step_enemies();
    }

    step_enemies() {
        // surprise! this is a horrible hard-coded mess.
        const x_spacing = 150;
        const x_start = G.rect_w(this.mdb.world.screen) / 2 - x_spacing;
        const y = G.rect_h(this.mdb.world.screen) * 0.7;
        const specs: [S.ImageSized, string][] = [[this.es, "LIGHT"], [this.em, "MEGA"], [this.ehm, "HYPERMEGA"]];
        specs.forEach((spec, i) => {
            const [image_sized, name] = spec;
            // todo: use measure_text().
            const offset_x = name.length / 2 * 15;
            const txy = G.v2d_mk(x_start + x_spacing*i - offset_x, y);
            const t: Dr.DrawText = {
                lb: txy,
                text: this.step_string(name),
                font: `40px ${K.MENU_FONT}`,
                fillStyle: this.body_cycle.current(),
                wrap: false,
            };
            this.mdb.frame_drawing.texts.push(t);
            const ixy = G.v2d_sub(G.v2d_mk(x_start + x_spacing*i, y), G.v2d_mk(0, 150));
            const rect = G.rect_fit_in(
                G.v2d_2_rect(image_sized.size),
                G.rect_mk_centered(ixy, image_sized.size)
            );
            this.mdb.frame_drawing.images.push({
                wrap: false,
                image_located: {
                    resource_id: image_sized.resource_id,
                    rect: rect,
                }
            });
        });
    }
}
