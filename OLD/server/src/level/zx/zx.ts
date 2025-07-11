/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import { RGBA } from '../../color';
import * as MDB from '../../menu/menu_db';
import * as K from '../../konfig';
import * as G from '../../geom';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import * as Gr from '../../ground';
import * as Rnd from '../../random';
import Ezx1 from './enemy_basic1';
import Es from './enemy_small1';
import Em from './enemy_mega1';
import Ehm from './enemy_hypermega1';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    const denom = K.LEVEL_TEMPLATE_COUNT;
    const buf = Math.floor(level_index / denom);
    return {
	player_kind: S.PlayerKind.zx,
	ground_kind: Gr.GroundKind.zx,
	Ebs1: { mk: Ezx1.warpin_mk, count: 20 + buf, limit: 5 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Es: { mk: Es.warpin_mk, count: 4 + buf, limit: 2 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Em: { mk: Em.warpin_mk, count: 4 + buf, limit: 2 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Ehm: { mk: Ehm.warpin_mk, count: 2 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 5*1000 },
	BG_COLOR: RGBA.new01(0, 0.05, 0.01),
	people_cluster_count: 3 + buf,
    };
};

class LevelImpl extends Lta.AbstractLevelTypeA {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;

    constructor(readonly index1: number, konfig: Lta.LevelKonfig, score: number, lives: number, high_score: Hs.HighScore) {
	super(index1, konfig, score, lives, high_score);
	const images = this.db.uncloned.images;
	this.small_snapshot = {
	    size: Es.SIZE,
	    resource_id: images.lookup(Es.WARPIN_RESOURCE_ID)
	};
	this.mega_snapshot = {
	    size: Em.SIZE,
	    resource_id: images.lookup(Em.WARPIN_RESOURCE_ID)
	};
	this.hypermega_snapshot = {
	    size: Ehm.SIZE,
	    resource_id: images.lookup(Ehm.WARPIN_RESOURCE_ID)
	};
    }

    get_starting_fx(): (mdb: MDB.MenuDB) => void {
	return (mdb: MDB.MenuDB): void => {
	    const seed = Math.floor(mdb.shared.sim_now / K.FPS*2);
	    let rnd = new Rnd.RandomImpl(seed);
	    let striper = false;
	    let color = RGBA.RED;
	    let lastY = 0;
	    let nextYOfn = () => K.d2si(
		rnd.boolean(0.6) ?
		    rnd.int_range(14, 16) :
		    rnd.int_range(3, 20)
	    );
	    for (let y = lastY + nextYOfn();
		 y < K.SCREEN_BOUNDS0.y;
		 y = lastY + nextYOfn()) {
		if (striper) {
		    mdb.shared.frame_drawing.rects.push({
			wrap: false,
			color,
			is_filled: true,
			rect: G.rect_mk(
			    G.v2d_mk(0, lastY),
			    G.v2d_mk(K.SCREEN_BOUNDS0.x, y-lastY)
			)
		    });
		    color = color === RGBA.RED ? RGBA.YELLOW : RGBA.RED;
		}
		striper = !striper;
		lastY = y;
	    }
	}
    }

    step() {
	super.step();
	this.db.shared.xyround = 8;
    }
}

export function level_mk(level_index: number, score: number, lives: number, high_score: Hs.HighScore): Lis.LevelInScreens {
    const LK = LKfn(level_index);
    const level = new LevelImpl(level_index, LK, score, lives, high_score);
    const lis = new Lis.LevelInScreens(level_index, level);
    return lis;
}
