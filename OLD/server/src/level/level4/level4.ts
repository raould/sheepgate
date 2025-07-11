/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import { RGBA } from '../../color';
import * as K from '../../konfig';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import * as Gr from '../../ground';
import Eb4 from '../../enemy/enemy_basic4';
import Eb5 from '../../enemy/enemy_basic5';
import Ep from '../../enemy/enemy_pod';
import Es from './enemy_small4';
import Em from './enemy_mega4';
import Ehm from './enemy_hypermega4';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    const denom = K.LEVEL_TEMPLATE_COUNT;
    const buf = Math.floor(level_index / denom);
    return {
	player_kind: S.PlayerKind.cow,
	ground_kind: Gr.GroundKind.regular,
	Eb4: { mk: Eb4.warpin_mk, count: 3 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 10*1000 },
	Eb5: { mk: Eb5.warpin_mk, count: 3 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 5*1000 },
	Ep: { mk: Ep.warpin_mk, count: 2 + buf, limit: 3 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Es: { mk: Es.warpin_mk, count: 4 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Em: { mk: Em.warpin_mk, count: 2 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 3*1000 },
	Ehm: { mk: Ehm.warpin_mk, count: 1 + buf, limit: 1 + buf, delay_msec: 1000, tick_msec: 5*1000 },
	BG_COLOR: RGBA.new01(0, 0.05, 0),
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
}

export function level_mk(level_index: number, score: number, lives: number, high_score: Hs.HighScore): Lis.LevelInScreens {
    const LK = LKfn(level_index);
    const level = new LevelImpl(level_index, LK, score, lives, high_score);
    const lis = new Lis.LevelInScreens(level_index, level);
    return lis;
}
