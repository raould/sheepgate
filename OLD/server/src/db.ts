import * as G from './geom';
import * as Dr from './drawing';
import { RGBA } from './color';

// todo: use in client.ts /rage

export interface World {
    // the bounds of the whole game world.
    bounds0: G.V2D;
    // display device pixels, inset due to overscan / look-and-feel.
    screen: G.Rect;
}

export interface DB<W extends World> {
    world: W;
    bg_color: RGBA;
    frame_drawing: Dr.Drawing;
    debug_graphics: Dr.Drawing[];
}
