/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from './geom';
import * as Dr from './drawing';
import * as So from './sound';
import { RGBA } from './color';

// todo: oh look, more bad naming.
// this is supposed to represent the server state being sent to the client.
// i think. so the GameDB and MenuDB has-a, not is-a, one of these.

// todo: shouldn't more of these things go into DBshared?!
// todo: use in client.ts /rage
// todo: the db stuff exploded quickly and got hacked up for level
// vs. menu so it is a big ball of confusing mud. :-(
// it is unclear which things need to be in only one. or both, etc.

export type DBKind = "Menu" | "Game";

// note: the names here are terrible and the info they are
// trying to encode should be done as types instead.
// i.e.
// i think "gameport.world_bounds" means "gameport.bounds_in_world: WorldCoords"
// vs. "gameport.screen_bounds" means "gameport.bounds_in_screen: ScreenCoords"

export interface World {
    // todo: also, types to differentiate point vs. vector vs. dimensions, etc.
    // the bounds of the whole game world.
    bounds0: G.V2D;
    // display device pixels, inset due to overscan / look-and-feel.
    screen: G.Rect;
    gameport: {
	world_bounds: G.Rect,
	screen_bounds: G.Rect,
    },
}

export interface DB<W extends World> {
    kind: DBKind;
    world: W;
    bg_color: RGBA;
    tick: number; // increment on each server step, even if the dt was 0.
    sim_now: number;
    frame_drawing: Dr.Drawing; // todo: kind of a bad name, actually?
    debug_graphics?: Dr.Drawing[];
    sfx: So.Sfx[];
    local_storage_json?: string;
    xyround?: number;
}
