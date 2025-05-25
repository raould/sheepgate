import * as K from './konfig';
import * as Cdb from './client_db';
import * as Gm from './game';
import * as T from './timer';
import * as D from './debug';
import * as U from './util/util';
import * as Hs from './high_scores';
import * as P from './perf';
import * as F from './fps';
import * as Full from './full_server_menu_db';
import * as WS from 'ws';

const ws2game: Map<any, U.O<Gm.Game>> = new Map();
const wss = new WS.Server({ port: 6969 });
const high_scores = Hs.high_scores_mk();

const PROFILE = false;
const pLoop = new P.PerfDuration(K.FPS, (avg) => D.log('big loop', U.F2D(avg)));
const pGame = new P.PerfDuration(K.FPS, (avg) => D.log('game step', U.F2D(avg)));
const fps = new F.FPS((fps) => D.log('fps', U.F2D(fps)));

// throbbing all clients' games in lock-step at K.FPS.
const last_msec = 0;
const t = new T.OnlyOneCallbackTimer(
    () => {
	let dbg_count = 0;
	const dbg_pre = Date.now();

	if (PROFILE) { pLoop.begin(); }
	ws2game.forEach((game, ws) => {
	    if (game != null) {
		dbg_count++;

		if (PROFILE) { pGame.begin(); }
		game.step();
		if (PROFILE) { pGame.end(); }

		const msg = game.stringify();
		ws.send(msg);

		D.debug_step_cancel();
	    }
	});
	if (PROFILE) { pLoop.end(); }
	if (PROFILE) { fps.on_tick(); }

	// any super bad time problems?
	const dbg_post = Date.now();
	const dbg_dt = dbg_post - dbg_pre;
	if (dbg_dt > K.FRAME_MSEC_DT) {
	    D.warn("slow server loop:", "#games:", dbg_count, "dt:", U.F2D(dbg_dt), ">", K.FRAME_MSEC_DT);
	}
    },
    K.FRAME_MSEC_DT);

t.start();

wss.on('connection', (ws) => {
    D.log("ws connected!");

    ws2game.delete(ws); // paranoia.

    ws.on('open', () => {
        // todo: why the heck is this never called?!
        // i suspect i strongly dislike websockets & implementations thereof.
        D.log("ws opened!");
    });

    ws.on('close', () => {
        ws2game.delete(ws);
        D.log("ws closed! ws game--", ws2game.size);
    });

    ws.on(
        'message',
        (msg: string) => {
            try {
		const full = ws2game.size >= K.MAX_CONCURRENT_GAMES;
		if (full) {
		    D.log("full!", ws2game.size, K.MAX_CONCURRENT_GAMES);
		    const msg = JSON.stringify(Full.full_server_menu_db);
		    ws.send(msg);
		    ws.close();
		}
		else {
                    const client_db: Cdb.ClientDB | null = JSON.parse(msg);
                    if (client_db != null) {
			let g: U.O<Gm.Game> = ws2game.get(ws);
			if (g == null) {
                            g = Gm.game_mk(high_scores);
                            ws2game.set(ws, g);
		    	    D.log("new! ws game++", ws2game.size);
			}
			D.assert(g != null, "g");
			g?.merge_client_db(client_db);
		    }
		}
            }
            catch (err) {
                D.error("ws Error:", err);
            }
        }
    );
});

D.log("ready!");
