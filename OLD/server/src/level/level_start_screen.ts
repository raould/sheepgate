/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Sz from '../menu/sizzler_screen';
import * as MDB from '../menu/menu_db';
import * as U from '../util/util';
import * as S from '../sprite';
import * as G from '../geom';
import * as K from '../konfig';
import * as Dr from '../drawing';
import * as Tx from '../util/text';
import { RGBA } from '../color';

const FONT_SIZE = K.d2si(30);
const ALERT_SIZE = K.d2si(20);

export interface Spec {
    image_sized: S.ImageSized;
    score: number;
}

interface SpecPrivate extends Spec {
    name: string;
    txy: G.V2D;
    rect: G.Rect;
}

export class LevelStartScreen extends Sz.SizzlerScreen {
    attract: any;
    specs: SpecPrivate[];
    alert_size: G.V2D | undefined;

    constructor(
	title: string,
	skip_text: string,
	private readonly es: Spec,
	private readonly em: Spec,
	private readonly ehm: Spec,
	bg_color: RGBA,
	private starting_fx: (menu: MDB.MenuDB) => void,
	private readonly alert: string,
    ) {
        super({
	    sizzle: false,
	    title,
	    skip_text,
	    bg_color,
	    timeout: 20*1000,
	    user_skip_after_msec: K.user_wait_msec(1000),
	});
	if (this.alert != undefined) {
	    this.alert_size = Tx.measure_text(this.alert, ALERT_SIZE);
	}
	this.mdb.shared.sfx.push({ sfx_id: K.SYNTH_D_SFX });
	this.attract = {
	    wrap: false,
	    image_located: {
		resource_id: "images/attract.png",
		rect: G.rect_inset(
		    K.SCREEN_RECT,
		    G.v2d_mk(20, 15)
		)
	    },
	    comment: "attract",
	};
	// surprise! this is a horrible hard-coded mess.
        const x_spacing = K.d2si(250);
        const x_start = G.rect_w(this.mdb.shared.world.screen) / 2 - x_spacing;
        const y = G.rect_h(this.mdb.shared.world.screen) * 0.6;
	// left to right on the screen.
	const image_specs = [
	    {...this.es, name: "LIGHT"},
	    {...this.em, name: "MEGA"},
	    {...this.ehm, name: "HYPERMEGA"},
	];
	this.specs = image_specs.map((named, i) => {
	    // the label.
	    const name = `${named.name}/${named.score}`;
            const offset_x = Tx.measure_text(name, FONT_SIZE).x / 2;
            const txy = G.v2d_mk(x_start + x_spacing*i - offset_x, y);
	    
	    // the image.
	    const x = x_start + x_spacing*i;
	    const yo = Math.sin((this.mdb.shared.tick + x)/30) * K.d2s(3);
	    const offset = K.vd2s(G.v2d_mk(0, 115));
            const ixy = G.v2d_sub(
		G.v2d_mk(x, y + yo),
		offset,
	    );
            const rect = G.rect_fit_in(
                G.v2d_2_rect(named.image_sized.size),
                G.rect_mk_centered(ixy, named.image_sized.size)
            );

	    return { ...named, name, txy, rect };
	}).reverse(); // right to left for z-ordering.
    }

    step() {
        super.step();
        this.mdb.shared.frame_drawing.images.push(this.attract);
        this.step_enemies();
	this.step_alert();
	this.starting_fx(this.mdb);
    }

    step_alert() {
	if (U.exists(this.alert) && U.exists(this.alert_size)) {
            const lb = G.v2d_mk(
		G.rect_w(this.mdb.shared.world.screen)/2 - (this.alert_size.x/2),
		G.rect_h(this.mdb.shared.world.screen) * 0.7
	    );
            const t: Dr.DrawText = {
                lb,
                text: this.alert,
                font: `${ALERT_SIZE}px ${K.MENU_FONT}`,
                fillStyle: RGBA.BLUE,
                wrap: false,
            };
            this.mdb.shared.frame_drawing.texts.push(t);
	}
    }

    step_enemies() {
        this.specs.forEach(({ image_sized, name, txy, rect }, i) => {
	    // ---------- labels ----------
            const t: Dr.DrawText = {
                lb: txy,
                text: this.step_string(name),
                font: `${FONT_SIZE}px ${K.MENU_FONT}`,
                fillStyle: RGBA.GRAY,
                wrap: false,
            };
            this.mdb.shared.frame_drawing.texts.push(t);

	    // ---------- images ----------
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
