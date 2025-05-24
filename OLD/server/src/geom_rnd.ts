import * as G from './geom';
import * as Rnd from './random';

export function v2d_random_inxy(rnd: Rnd.Random, scale_x: number, scale_y: number): G.V2D {
    return G.v2d_mk(
        rnd.float_0_1() * scale_x,
        rnd.float_0_1() * scale_y
    )
}
export function v2d_random_around(rnd: Rnd.Random, center: G.V2D, half_bound: G.V2D): G.V2D {
    return G.v2d_mk(
        rnd.float_around(center.x, half_bound.x),
        rnd.float_around(center.y, half_bound.y)
    )
}
export function v2d_random_inrect(rnd: Rnd.Random, rect: G.Rect): G.V2D {
    return G.v2d_mk(
        rect.lt.x + rnd.float_0_1() * rect.size.x,
        rect.lt.y + rnd.float_0_1() * rect.size.y
    );
}
