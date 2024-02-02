import * as G from './geom';

export function near_enough(a: G.V2D, b: G.V2D, e: number=1): boolean {
    const d = G.v2d_sub(a, b);
    const m = G.v2d_len(d);
    return Math.abs(m) <= Math.abs(e);
}

