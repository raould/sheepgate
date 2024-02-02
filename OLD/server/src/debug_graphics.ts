import * as G from './geom';
import * as Dr from './drawing';
import { RGBA } from './color';
import * as GDB from './game_db';
import * as _ from 'lodash';

// arbitrary colors to use, already alpha'd fwiw.
export const DEBUG_COLOR_RED = RGBA.RED.setAlpha01(0.4);
export const DEBUG_COLOR_GREEN = RGBA.GREEN.setAlpha01(0.4);
export const DEBUG_COLOR_BLUE = RGBA.BLUE.setAlpha01(0.4);

// singleton. hack. whatever. i want this to be
// globally callable from anywhere, as evil as that is.
// todo: this is kind of a weird mish-mash of functions oh well.
// the naming is horrible, like all the different ways to draw a rect!
export namespace DebugGraphics {
    let permanent: Dr.Drawing = Dr.drawing_mk();
    let frame: Dr.Drawing = Dr.drawing_mk();

    export function get_graphics(): Dr.Drawing[] {
        return [permanent, frame];
    }

    // they only last 1 frame.
    export function get_frame(): Dr.Drawing {
        return frame;
    }

    // they never go away.
    export function get_permanent(): Dr.Drawing {
        return permanent;
    }

    export function reset(db: GDB.GameDB) {
        const prev = frame;
        frame = Dr.drawing_mk();
    }

    export function add_bounds(dst: Dr.Drawing, db: GDB.GameDB) {
        add_DrawLine(dst, {
            wrap: false,
            color: RGBA.YELLOW,
            line_width: 2,
            p0: G.v2d_mk(0, db.shared.world.ground_y),
            p1: G.v2d_mk(db.shared.world.bounds0.x, db.shared.world.ground_y),
        });
        add_rect_cross(dst, G.v2d_2_rect(db.shared.world.bounds0));
        add_rect_cross(dst, db.shared.world.gameport.world_bounds);
        add_rect_cross(dst, db.shared.world.gameport.enemy_firing_bounds);
    }

    export function add_DrawLine(dst: Dr.Drawing, dl: Dr.DrawLine)  {
        dst.lines.push(dl);
    }

    export function add_point(dst: Dr.Drawing, pt: G.V2D) {
        const o = G.v2d_mk_nn(5);
        add_rect(
            dst,
            G.rect_mk(
                G.v2d_sub(pt, o),
                G.v2d_scale(o, 2)
            ),
        );
    }

    export function add_rect(dst: Dr.Drawing, r: G.Rect) {
        add_DrawRect(
            dst,
            {
                wrap: true,
                line_width: 1,
                color: DEBUG_COLOR_GREEN,
                is_filled: false,
                rect: r
            },
        );
    }

    const MID_RECT_SIZE = G.v2d_mk(10, 10);
    const MID_RECT_RADIUS = G.v2d_scale(MID_RECT_SIZE, 0.5);
    // like, maybe since this is named "_DrawRect" is shouldn't ameliorate with the cross?
    export function add_DrawRect(dst: Dr.Drawing, dr: Dr.DrawRect) {
        dst.rects.push(dr);
        const mid = G.rect_mid(dr.rect);
        const mid_rect = G.rect_mk(
            G.v2d_sub(mid, MID_RECT_RADIUS),
            MID_RECT_SIZE
        );
        dst.rects.push({
            ...dr,
            rect: mid_rect,
        });
        add_rect_cross(dst, mid_rect);
    }

    export function add_DrawEllipse(dst: Dr.Drawing, de: Dr.DrawEllipse) {
        dst.ellipses.push(de);
    }

    export function add_DrawText(dst: Dr.Drawing, dt: Dr.DrawText) {
        dst.texts.push(dt);
    }

    function add_rect_cross(dst: Dr.Drawing, r: G.Rect) {
        const lt = r.lt;
        const rb = G.rect_rb(r);
        dst.lines.push({
            p0: lt,
            p1: rb,
            line_width: 1,
            color: DEBUG_COLOR_RED,
            wrap: false,
        });
        dst.lines.push({
            p0: G.v2d_mk(rb.x, lt.y),
            p1: G.v2d_mk(lt.x, rb.y),
            line_width: 1,
            color: DEBUG_COLOR_RED,
            wrap: false,
        });
        dst.rects.push({
            rect: r,
            line_width: 1,
            color: DEBUG_COLOR_BLUE,
            is_filled: false,
            wrap: false,
        });
        // also inset 10 so we can see it if we're exactly aligned.
        dst.rects.push({
            rect: G.rect_pad_v2d(r, G.v2d_mk_nn(-10)),
            line_width: 1,
            color: DEBUG_COLOR_BLUE,
            is_filled: false,
            wrap: false,
        });
    }
}
