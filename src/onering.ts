// todo:
// load the server,
// load the client,
// connect them,
// start the server.
// ???
// profit.

import * as K from '@server/konfig';
import * as Cdb from '@server/client_db';
import * as Gm from '@server/game';
import * as T from '@server/timer';
import * as D from '@server/debug';
import * as U from '@server/util/util';
import * as Hs from '@server/high_scores';
import * as P from '@server/perf';
import * as F from '@server/fps';

const PROFILE = false;
const pGame = new P.PerfDuration(K.FPS, (avg) => D.log('game step', U.F2D(avg)));
const fps = new F.FPS((fps) => D.log('fps', U.F2D(fps)));
const high_scores = Hs.high_scores_mk();

const game = Gm.game_mk(high_scores);

const t = new T.OnlyOneCallbackTimer(
    () => {
	const dbg_pre = Date.now();
	if (PROFILE) { pGame.begin(); }
	// todo: game.merge_client_db(client_db);
	game.step();
	if (PROFILE) { pGame.end(); }
	D.debug_step_cancel();
	if (PROFILE) { fps.on_tick(); }
	// any super bad time problems?
	const dbg_dt = Date.now() - dbg_pre;
	if (dbg_dt > K.DT) {
	    D.warn("slow server loop:", "dt:", U.F2D(dbg_dt), ">", K.DT);
	}
    },
    K.DT
);

t.start();
