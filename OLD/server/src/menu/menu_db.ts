/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as K from '../konfig';
import * as Db from '../db';
import * as U from '../util/util';
import * as S from '../sprite';
import * as So from '../sound';
import * as G from '../geom';
import * as Dr from '../drawing';
import { RGBA } from '../color';

export interface MenuDB {
    frame_dt: number;
    // *** warning: note that all of 'shared' round-trips with the client! ***
    shared: Db.DB<Db.World>;
}

export function menudb_mk(bg_color: RGBA): MenuDB {
    return {
	frame_dt: K.FRAME_MSEC_DT,
	shared: {
	    kind: "Menu",
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
	    sfx: [],
	}
    };
}
