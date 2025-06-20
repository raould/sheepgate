/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Sz from '../menu/sizzler_screen';
import * as S from '../sprite';
import * as G from '../geom';
import * as K from '../konfig';
import * as Dr from '../drawing';
import { RGBA, HCycle } from '../color';

const FONT_SIZE = K.d2si(40);

export class LevelStartScreen extends Sz.SizzlerScreen {
    attract: any;

    constructor(
	title: string,
	skip_text: string,
	private readonly es: S.ImageSized,
	private readonly em: S.ImageSized,
	private readonly ehm: S.ImageSized,
	bg_color: RGBA) {
        super({
	    title,
	    skip_text,
	    bg_color,
	    timeout: 10*1000
	});
	this.mdb.shared.sfx.push({ sfx_id: K.SYNTH_D_SFX });
	this.attract = {
	    wrap: false,
	    image_located: {
		resource_id: "images/attract.png",
		rect: K.SCREEN_RECT
	    },
	    comment: "attract",
	};
    }

    step() {
        super.step();
        this.mdb.shared.frame_drawing.images.push(this.attract);
        this.step_enemies();
    }

    step_enemies() {
        // surprise! this is a horrible hard-coded mess.
        const x_spacing = K.d2si(150);
        const x_start = G.rect_w(this.mdb.shared.world.screen) / 2 - x_spacing;
        const y = G.rect_h(this.mdb.shared.world.screen) * 0.6;

        const specs: [S.ImageSized, string][] = [[this.es, "LIGHT"], [this.em, "MEGA"], [this.ehm, "HYPERMEGA"]];
        specs.forEach((spec, i) => {
            const [image_sized, name] = spec;

	    // ---------- labels ----------
            // todo: use measure_text().
            const offset_x = name.length / 2 * (FONT_SIZE/3);
            const txy = G.v2d_mk(x_start + x_spacing*i - offset_x, y);
            const t: Dr.DrawText = {
                lb: txy,
                text: this.step_string(name),
                font: `${FONT_SIZE}px ${K.MENU_FONT}`,
                fillStyle: this.body_cycle.current(),
                wrap: false,
            };
            this.mdb.shared.frame_drawing.texts.push(t);

	    // ---------- images ----------
	    const x = x_start + x_spacing*i;
	    const yo = Math.sin((this.mdb.shared.tick + x)/30) * K.d2s(3);
	    const offset = K.vd2s(G.v2d_mk(0, 110));
            const ixy = G.v2d_sub(
		G.v2d_mk(x, y + yo),
		offset,
	    );
            const rect = G.rect_fit_in(
                G.v2d_2_rect(image_sized.size),
                G.rect_mk_centered(ixy, image_sized.size)
            );
            this.mdb.shared.frame_drawing.images.push({
                wrap: false,
                image_located: {
                    resource_id: image_sized.resource_id,
                    rect: rect,
                }
            });
        });
    }
}
