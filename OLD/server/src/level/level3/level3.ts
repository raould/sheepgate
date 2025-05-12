import { RGBA } from '../../color';
import * as K from '../../konfig';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import Eb1 from '../../enemy/enemy_basic1';
import Eb2 from '../../enemy/enemy_basic2';
import Eb3 from '../../enemy/enemy_basic3';
import Es from './enemy_small3';
import Em from './enemy_mega3';
import Ehm from './enemy_hypermega3';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    const denom = K.LEVEL_TEMPLATE_COUNT;
    const buf = Math.floor(level_index / denom);
    return {
	Eb1: Eb1,
	ENEMY_BASIC1_COUNT: 3 + buf,
	ENEMY_BASIC1_SPAWN_COUNT_LIMIT: 2 + buf,

	Eb2: Eb2,
	ENEMY_BASIC2_COUNT: 3 + buf,
	ENEMY_BASIC2_SPAWN_COUNT_LIMIT: 2 + buf,

	Eb3: Eb3,
	ENEMY_BASIC3_COUNT: 3 + buf,
	ENEMY_BASIC3_SPAWN_COUNT_LIMIT: 2 + buf,

	Es: Es,
	ENEMY_SMALL_COUNT: 4 + buf,
	// no buf so there aren't too many mixed in with basics.
	ENEMY_SMALL_SPAWN_COUNT_LIMIT: 2,

	Em: Em,
	ENEMY_MEGA_COUNT: 3 + buf,
	ENEMY_MEGA_SPAWN_COUNT_LIMIT: 2 + buf,

	Ehm: Ehm,
	ENEMY_HYPERMEGA_COUNT: 2 + buf,
	ENEMY_HYPERMEGA_SPAWN_COUNT_LIMIT: 1 + buf,

	BG_COLOR: RGBA.new01(0.15, 0.1, 0),

	people_cluster_count: 3 + buf,
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
