import { RGBA } from '../../color';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import * as Es from './enemy_small2';
import * as Em from './enemy_mega2';
import * as Ehm from './enemy_hypermega2';
import * as Hs from '../../high_scores';

enum EnemyPhase {
	small_enemies,
	mega_enemies,
	hypermega_enemies,
}

// todo: move 'L' things from konfig to here.
const LK = {
	Es: Es,
	ENEMY_SMALL_COUNT: 6,
	ENEMY_SMALL_SPAWN_COUNT_LIMIT: 3,

	Em: Em,
	ENEMY_MEGA_COUNT: 3,
	ENEMY_MEGA_SPAWN_COUNT_LIMIT: 2,

	Ehm: Ehm,
	ENEMY_HYPERMEGA_COUNT: 1,
	ENEMY_HYPERMEGA_SPAWN_COUNT_LIMIT: 1,

	BG_COLOR: RGBA.new01(0.1, 0, 0.1),

	people_cluster_count: 2,
};

class LevelImpl extends Lta.AbstractLevelTypeA {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;

	constructor(readonly index1: number, konfig: any, score: number, high_score: Hs.HighScore) {
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
	const level = new LevelImpl(level_index, LK, score, high_score);
	const lis = new Lis.LevelInScreens(level_index, level);
	return lis;
}
