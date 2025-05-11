import * as DB from '../db';
import * as U from '../util/util';
import * as S from '../sprite';
import * as So from '../sound';
import * as G from '../geom';

export interface MenuDB extends DB.DB<DB.World> {
    images: U.Dict<S.ImageLocated>;
    frame_dt: number;
    items: { sfx: So.Sound[]; };
}

export function stringify(mdb: MenuDB): string {
    // todo: fix the db's to not be such a train wreck.
    // adding in things here that the client is expecting.
    const hack = mdb.world as any;
    hack.gameport = {
        world_bounds: G.v2d_2_rect(mdb.world.bounds0),
        screen_bounds: G.v2d_2_rect(mdb.world.bounds0),
        enemy_firing_bounds: G.v2d_mk_0()
    }
    return `{"menu_db": ${U.stringify(mdb)}}`;
}
