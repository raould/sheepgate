import { RGBA } from '../../color';
import * as K from '../../konfig';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import Eb2 from '../../enemy/enemy_basic2';
import Es from './enemy_small2';
import Em from './enemy_mega2';
import Ehm from './enemy_hypermega2';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    const denom = K.LEVEL_TEMPLATE_COUNT;
    const buf = Math.floor(level_index / denom);
    return {
	Eb2: { mk: Eb2.warpin_mk, count: 3 + buf, limit: 2 + buf },
	Es: { mk: Es.warpin_mk, count: 4 + buf, limit: 1 + buf },
	Em: { mk: Em.warpin_mk, count: 2 + buf, limit: 1 + buf },
	Ehm: { mk: Ehm.warpin_mk, count: 1 + buf, limit: 1 + buf },
	BG_COLOR: RGBA.new01(0, 0.1, 0.05),
	people_cluster_count: 2 + buf,
    };
};

class LevelImpl extends Lta.AbstractLevelTypeA {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;

    constructor(readonly index1: number, konfig: Lta.LevelKonfig, score: number, high_score: Hs.HighScore) {
	super(index1, konfig, score, high_score);
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

export function level_mk(level_index: number, score: number, high_score: Hs.HighScore): Lis.LevelInScreens {
    const LK = LKfn(level_index);
    const level = new LevelImpl(level_index, LK, score, high_score);
    const lis = new Lis.LevelInScreens(level_index, level);
    return lis;
}
