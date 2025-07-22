import * as K from './konfig';
import * as U from './util/util';
import * as S from './sprite';
import * as GDB from './game_db';
import * as Rnd from './random';
import * as G from './geom';
import * as A from './animation';
import { DebugGraphics } from './debug_graphics';

const SIZE = K.vd2si(G.v2d_scale_v2d_i(G.v2d_mk(32, 32), G.v2d_mk(2.5, 2)));

export function worm_mk(db: GDB.GameDB) {
    if (Rnd.singleton.boolean(K.WORM_CHANCE)) {
	U.if_let(
	    db.shared.items.player,
	    player => {
		const gmt = G.rect_mt(db.shared.items.ground[0]);
		const bounds = db.shared.world.bounds0;
		const vp = db.shared.world.gameport.world_bounds;
		const bw = G.rect_w(vp);
		const px = G.rect_mx(player);
		const dlx = G.smallest_diff_wrapped(G.rect_l(vp), px, bounds.x);
		const drx = G.smallest_diff_wrapped(G.rect_r(vp), px, bounds.x);
		const wx = G.rect_l(vp) + bw * (dlx > drx ? 0.2 : 0.8);
		const anim = anim_mk(db);
		const lt = G.v2d_mk(wx, gmt.y - SIZE.y + K.d2si(20)); // barf.
		const rect = G.rect_mk(lt, SIZE);
		DebugGraphics.add_rect(DebugGraphics.get_frame(), rect);
		// only allow worms in unoccupied ground areas vs. people & base.
		// note: not a proper rect-overlap-reject test, but empirically close enough.
		const gi = Math.floor(G.rect_mx(rect) / K.TILE_WIDTH);
		const g = db.shared.items.ground[gi];
		if (g?.populated != true) {
		    GDB.add_sprite_dict_id_mut(
			db.shared.items.fx,
			(dbid: GDB.DBID): U.O<S.Sprite> => {
			    return {
				dbid,
				...A.anim_sprite_mk(
				    db,
				    rect,
				    anim
				),
				comment: `worm-${dbid}`,
			    }
			}
		    );
		}
	    }
	);
    }
}

function anim_mk(db: GDB.GameDB): A.ResourceAnimator {
    const resource_ids = Rnd.singleton.boolean() ?
	  db.uncloned.images.lookup_range_n(n => `worm/worm_${n}.png`, 0, 10) :
	  db.uncloned.images.lookup_range_n(n => `worm/${n}.png`, 0, 7);
    return A.animator_mk(
	db.shared.sim_now,
	{
	    frame_msec: 100,
	    resource_ids,
	    starting_mode: A.MultiImageStartingMode.hold,
	    ending_mode: A.MultiImageEndingMode.hide,
	}
    );
}
