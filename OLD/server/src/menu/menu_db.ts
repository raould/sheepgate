import * as K from '../konfig';
import * as DB from '../db';
import * as U from '../util/util';
import * as S from '../sprite';
import * as So from '../sound';
import * as G from '../geom';
import * as Dr from '../drawing';
import { RGBA } from '../color';

export interface MenuDB extends DB.DB<DB.World> {
    frame_dt: number;
    items: { sfx: So.Sfx[]; };
}

export function menudb_mk(bg_color: RGBA): MenuDB {
    return {
        world: {
            screen: K.SCREEN_RECT,
            bounds0: K.SCREEN_RECT.size,
	    gameport: {
		world_bounds: K.SCREEN_RECT,
		screen_bounds: K.SCREEN_RECT,
	    },
        },
        bg_color: bg_color,
        frame_drawing: Dr.drawing_mk(),
        debug_graphics: [],
        frame_dt: K.DT,
	items: { sfx: [] },
    };
}

export function stringify(mdb: MenuDB): string {
    return `{"menu_db": ${U.stringify(mdb)}}`;
}
