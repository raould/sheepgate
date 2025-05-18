import * as G from './geom';
import * as Dr from './drawing';
import { RGBA } from './color';

// todo: shouldn't more of these things go into DBshared?!
// ugh, it is unclear to me statically what is shared with the client :-(

// todo: use in client.ts /rage
// todo: the db stuff exploded quickly and got hacked up for level
// vs. menu so it is a big ball of confusing mud. :-(
// it is unclear which things need to be in only one. or both, etc.

export interface World {
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
    world: W;
    bg_color: RGBA;
    frame_drawing: Dr.Drawing; // todo: kind of a bad name, actually?
    debug_graphics?: Dr.Drawing[];
}
