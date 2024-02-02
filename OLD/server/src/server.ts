import * as K from './konfig';
import * as Cdb from './client_db';
import * as Gm from './game';
import * as T from './timer';
import * as D from './debug';
import * as U from './util/util';
import * as Hs from './high_scores';
import * as WS from 'ws';

const ws2game: Map<any, U.O<Gm.Game>> = new Map();
const wss = new WS.Server({ port: 6969 });
const high_scores = Hs.high_scores_mk();

// throbbing all clients' games in lock-step at K.FPS.
const t = new T.OnlyOneCallbackTimer(
    () => ws2game.forEach((game, ws) => {
        if (game != null) {
            game.step();
            ws.send(game.stringify());
            D.debug_step_cancel();
        }
    }),
    K.DT
);
t.start();

wss.on('connection', (ws) => {
    ws2game.set(ws, undefined);
    D.log(`ws connected! # remaining games: ${ws2game.size}`);

    ws.on('open', () => {
        // todo: why the heck is this never called?!
        // i suspect i strongly dislike websockets & implementations thereof.
        D.log("ws opened!");
    });

    ws.on('close', () => {
        ws2game.delete(ws);
        D.log(`ws closed! # remaining games: ${ws2game.size}`);
    });

    ws.on(
        'message',
        (msg: string) => {
            try {
                const client_db: Cdb.ClientDB | null = JSON.parse(msg);
                if (client_db != null) {
                    let g: U.O<Gm.Game> = ws2game.get(ws);
                    if (g == null) {
                        g = Gm.game_mk(high_scores);
                        ws2game.set(ws, g);
                    }
                    g.merge_client_db(client_db);
                }
            }
            catch (err) {
                console.error(err);
            }
        }
    );
});

D.log("ready!");
