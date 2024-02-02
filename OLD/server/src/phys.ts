import * as G from './geom';
import * as K from './konfig';

export const MIN_VEL_CLAMP = G.v2d_mk(0.01, 0.01);

export function drag(e: G.P2D): G.V2D {
    // todo: mass?
    return G.v2d_scale_v2d(
        e.vel,
        K.DRAG_ACC
    );
}

export function drag_x(e: G.P2D): G.V2D {
    // todo: mass?
    return G.v2d_scale_v2d(
        e.vel,
        G.v2d_set_y(K.DRAG_ACC, 1)
    );
}

export function p2d_step(e: G.P2D, dt: number): G.P2D {
    const e2 = G.p2d_clone(e);
    G.v2d_add_mut(e2.lt, G.v2d_scale(e2.vel, dt));
    G.v2d_add_mut(e2.vel, G.v2d_scale(e2.acc, dt / (e2.mass ?? 1)));
    G.v2d_0_mut(e2.acc);
    G.v2d_deadzone(e2.vel, MIN_VEL_CLAMP);
    return e2;
}

export function p2d_step_mut(e: G.P2D, dt: number) {
    G.v2d_add_mut(e.lt, G.v2d_scale(e.vel, dt));
    G.v2d_add_mut(e.vel, G.v2d_scale(e.acc, dt / (e.mass ?? 1)));
    G.v2d_0_mut(e.acc);
}

export function p2d_force_drag_step_mut(src: G.P2D, delta_acc: G.V2D, dt: number) {
    G.v2d_add_mut(src.acc, delta_acc);
    G.v2d_add_mut(src.acc, drag(src));
    p2d_step_mut(src, dt);
}
