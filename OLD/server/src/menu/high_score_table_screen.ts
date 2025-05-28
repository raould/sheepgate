import * as Sz from './sizzler_screen';
import * as G from '../geom';
import * as K from '../konfig';
import * as Hs from '../high_scores';
import * as Dr from '../drawing';
import * as Tx from '../util/text';
import * as A from '../animation';
import * as U from '../util/util';
import * as _ from 'lodash';
import { RGBA, HCycle } from '../color';

const MUSIC_SFX = {
    sfx_id: K.WIGGLE_SFX,
    gain: 0.5,
    singleton: true,
};

export class HighScoreTableScreen extends Sz.SizzlerScreen {
    constructor(private readonly table: Hs.HighScores) {
        super({ title: "HIGH SCORES", skip_text: "PRESS [FIRE] TO CONTINUE", bg_color: RGBA.DARK_BLUE, timeout: 30*1000 });
	this.mdb.shared.sfx.push(MUSIC_SFX);
    }

    step() {
        super.step()
        this.step_body()
	this.mdb.shared.sfx.push(MUSIC_SFX);
    }

    step_body() {
        const t_hcycle = new HCycle(this.header_cycle.hsv, this.header_cycle.delta * 3);
        t_hcycle.next();
        const center = G.v2d_mk(this.mdb.shared.world.bounds0.x * 0.5, this.mdb.shared.world.bounds0.y * 0.3);
        const score_width = U.count_digits(this.table.scores[0].score);
        this.table.scores.forEach((high_score: Hs.HighScore, index: number) => {
            const mi = Tx.measure_text(high_score.callsign, 40);
            const ms = Tx.measure_text(String(high_score.score), 40);
            const v_offset = (Math.max(mi.y, ms.y) + 5) * index;

            const t = ((this.elapsed / (this.mdb.frame_dt*100)) + ((10-index)/10)) % 1;
            const wiggle = A.ease_in_out(t, -20, 20);

            const hi_offset = -1 * mi.x - wiggle - 25;
            const ti: Dr.DrawText = {
                lb: G.v2d_add(center, G.v2d_mk(hi_offset, v_offset)),
                text: high_score.callsign,
                font: `40px ${K.MENU_FONT}`,
                fillStyle: t_hcycle.current(),
                wrap: false,
            };            
            this.mdb.shared.frame_drawing.texts.push(ti);

            const hs_offset = 25 - wiggle;
            const ts: Dr.DrawText = {
                lb: G.v2d_add(center, G.v2d_mk(hs_offset, v_offset)),
                text: _.padStart(high_score.score.toString(), score_width, '0'),
                font: `40px ${K.MENU_FONT}`,
                fillStyle: t_hcycle.current(),
                wrap: false,
            };            
            this.mdb.shared.frame_drawing.texts.push(ts);

            t_hcycle.next();
        });
    }
}
