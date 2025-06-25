/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from './geom';
import * as S from './sprite';
import * as D from './debug';
import * as K from './konfig';
import * as U from './util/util';
// import { DebugGraphics, DEBUG_COLOR_RED, DEBUG_COLOR_BLUE } from './debug_graphics';
// const debug = true; // might be extra slow if enabled!

export enum CMask {
    none = 0,
    FIRST = 1 << 0,
    general = FIRST,
    player = 1 << 1,
    people = 1 << 2,
    base = 1 << 3,
    enemy = 1 << 4,
    gem = 1 << 5,
    // unlike shields which just use 'player' or 'enemy' or 'base',
    // different shot types shouldn't actually collide so
    // they are all put into their own shot layers. confusing!
    playerShot = 1 << 6,
    enemyShot = 1 << 7,
    LAST = base,
}

export interface Masked {
    // the layers it exists in.
    in_cmask: CMask;
    // the layers that can hit it.
    from_cmask: CMask;
}

export enum Reaction {
    // note: these are an ordering and are used as such in code.
    ignore, // no visible reaction at all, but might trigger something e.g. teleport.
    fx,     // a visible reaction, but there's no harm taken.
    hp,     // harm taken, and maybe some kind of visible reaction as well.
}

export interface Ignores {
    ignores?: Map<CMask, Reaction>;
}

export function ignores_test(a: S.CollidableSprite, b: S.CollidableSprite): Reaction {
    let ignore: U.O<Reaction> = undefined;
    if (a.ignores != null) {
        a.ignores.forEach((v: Reaction, k: CMask) => {
            if (U.has_bits_eq(b.in_cmask, k)) {
                ignore = (ignore == null || ignore < v) ? v : ignore;
            }
        });
    }
    return ignore != null ? ignore : Reaction.hp;
}

function mask_test(a: S.CollidableSprite, b: S.CollidableSprite): boolean {
    return U.has_bits(a.from_cmask, b.in_cmask);
}

// todo: experiment with some things being {ellipse,rectangle}-{ellipse,rectangle}
// collisions instead of everything being only ellipse-ellipse collisions,
// like maybe the player shots that are long and skinny.
// todo: yeah i have not tested this, it likely is broken...
export function rect_ellipse_test(r: G.Rect, e: G.Rect): boolean {
    let s = G.scale_ellipse_to_outer_circle(e);
    let c = G.rect_scale_mid_v2d(e, s);
    let r2 = G.rect_scale_mid_v2d(r, s);
    const d2 = G.min_radius(c) ** 2;
    if (point_quadrant_gteq_distance(G.rect_lt(r2), G.Quadrant.rb, d2)) { return false; }
    if (point_quadrant_gteq_distance(G.rect_lb(r2), G.Quadrant.rt, d2)) { return false; }
    if (point_quadrant_gteq_distance(G.rect_rt(r2), G.Quadrant.lb, d2)) { return false; }
    if (point_quadrant_gteq_distance(G.rect_rb(r2), G.Quadrant.lt, d2)) { return false; }
    return true;
}

function point_quadrant_gteq_distance(p: G.V2D, q: G.Quadrant, d2: number): boolean {
    if (G.v2d_quadrant(p) == q) {
        return G.v2d_len2(p) >= d2;
    }
    return false;
}

export function ellipse_ellipse_test(e1: G.Rect, e2: G.Rect): boolean {
    // todo: use G.rect_circle_inside, G.rect_circle_outside?

    // scale an ellipse to make a circle.
    let s = G.v2d_mk(e1.size.y / e1.size.x, 1)
    let c1 = G.rect_scale_mid_v2d(e1, s);

    // then scale the other the same amount, in the same coords.
    let e22 = G.rect_scale_v2d_anchor(e2, s, G.rect_mid(e1));
    // then make that other ellipse bigger by the radius of the circle.
    let e23 = G.rect_pad_v2d(e22, G.v2d_mk(c1.size.x / 2, c1.size.x / 2))

    // then scale remaining ellipse down to a circle.
    let s2 = e23.size.x > e23.size.y ? G.v2d_mk(e23.size.y / e23.size.x, 1) : G.v2d_mk(1, e23.size.x / e23.size.y)
    let c12 = G.rect_scale_v2d_anchor(c1, s2, G.rect_mid(e23));

    // then check if the first circle center is inside the second circle.
    let e24 = G.rect_scale_v2d_anchor(e23, s2, G.rect_mid(e23));
    let d = G.v2d_len(G.v2d_sub(G.rect_mid(c12), G.rect_mid(e24)))
    return d < e24.size.x / 2
}

export type Reports = Map</*src*/S.CollidableSprite, /*dsts*/Set<S.CollidableSprite>>;

class Bin {
    objs: Map<string/*dbid*/, S.CollidableSprite>;

    constructor() {
        this.objs = new Map<string/*dbid*/, S.CollidableSprite>();
    }

    clear() {
        this.objs.clear();
    }

    add(c: S.CollidableSprite) {
        D.assert(!this.objs.has(c.dbid), c.comment);
        this.objs.set(c.dbid, c);
    }

    // run through each "source" and update it
    // with all the things it collides. provide
    // symmetric pairs so that each thing can be
    // updated as the "source" in turn.
    get_reports(): Reports {
        const pairs: Reports = new Map<S.CollidableSprite, Set<S.CollidableSprite>>();
        for (const id1 of this.objs.keys()) {
            for (const id2 of this.objs.keys()) {
                const c1: U.O<S.CollidableSprite> = this.objs.get(id1);
                const c2: U.O<S.CollidableSprite> = this.objs.get(id2);
                D.assert(c1 != null, c1);
                D.assert(c2 != null, c2);
                if (id1 !== id2 && c1 != null && c2 != null) {
                    // "just" do the right collision detection here.
                    const c1_sees_c2 = mask_test(c1, c2);
                    const c2_sees_c1 = mask_test(c2, c1);
                    if ((c1_sees_c2 || c2_sees_c1) && (ellipse_ellipse_test(c1, c2))) {
                        if (c1_sees_c2) {
                            U.get_or_mk_map<S.CollidableSprite, S.CollidableSprite>(pairs, c1, U.set_mk).add(c2);
                        }
                        if (c2_sees_c1) {
                            U.get_or_mk_map<S.CollidableSprite, S.CollidableSprite>(pairs, c2, U.set_mk).add(c1);
                        }
                    }
                }
            }
        }
        return pairs;
    }
}

export class Collision {

    private static calculate_bin_dim(bound: number, max: number): number {
        return Math.ceil(Math.max(K.MIN_BIN_SIZE, bound / max))
    }

    private bin_size: G.V2D;
    private bins: Array<Array<Bin>> = [];

    constructor(private readonly bounds: G.Rect) {
        this.bin_size = G.v2d_mk(
            Collision.calculate_bin_dim(G.rect_w(bounds), K.MAX_BIN_X_COUNT),
            Collision.calculate_bin_dim(G.rect_h(bounds), K.MAX_BIN_Y_COUNT),
        );
        this.bounds = bounds;
        this.create();

        // this.visit_bins((bin: Bin, r: number, c: number) => {
        //     DebugGraphics.add_DrawRect(
        //         DebugGraphics.get_permanent(),
        //         {
        //             rect: G.rect_mk(
        //                 G.v2d_add(this.bounds.lt, G.v2d_scale_v2d(this.bin_size, G.v2d_mk(c, r))),
        //                 this.bin_size
        //             ),
        //             line_width: 1,
        //             color: DEBUG_COLOR_BLUE,
        //             is_filled: false,
        //             wrap: true,
        //         }
        //     );
        // });     
    }

    private get_bins(row: number, col: number): Bin[] {
        const got: Bin[] = [];
        // match: world wrapping-clipping behaviour.
        // so we only wrap the x's == cols, not the y's == rows.
        U.if_let(
            this.bins[row],
            (br) => {
                // regular.
                const regular_bin = br[col];
                if (regular_bin != null) { got.push(regular_bin); }
                // wrapped.
                const wrapped_col = U.index_looped(br.length, col);
                if (wrapped_col != col) {
                    const wrapped_bin = br[wrapped_col];
                    if (wrapped_bin != null) { got.push(wrapped_bin); }
                }
            }
        );
        return got;
    }

    private set_bin(row: number, col: number, bin: Bin) {
        this.bins[row][col] = bin;
    }

    private visit_bins(visit: any/*todo:(bin,r,c)->void*/) {
        for (let r = 0; r < this.bins.length; ++r) {
            for (let c = 0; c < this.bins[r].length; ++c) {
                visit(this.bins[r][c], r, c);
            }
        }
    }

    add(s?: S.CollidableSprite) {
        if (s != null) {
            const r: G.Rect = G.rect_clone(s);
            this.add_collidable(s);
        }
    }

    private add_collidable(s: S.CollidableSprite) {
        const lt = G.v2d_sub(G.rect_lt(s), this.bounds.lt);
        const rb = G.v2d_sub(G.rect_rb(s), this.bounds.lt);
        const min_x = Math.floor(lt.x / this.bin_size.x);
        const max_x = Math.floor(rb.x / this.bin_size.x);
        const min_y = Math.floor(lt.y / this.bin_size.y);
        const max_y = Math.floor(rb.y / this.bin_size.y);
        for (let r = min_y; r <= max_y; ++r) {
            for (let c = min_x; c <= max_x; ++c) {
                const bins = this.get_bins(r, c);
                for (const b of bins) {
                    b.add(s);
                }
            }
        }
    }

    get_reports(): Reports {
        const reports: Reports = new Map<S.CollidableSprite, Set<S.CollidableSprite>>();
        this.visit_bins((bin: Bin) => {
            const r = bin.get_reports();
            for (const k of r.keys()) {
                const new_s: U.O<Set<S.CollidableSprite>> = r.get(k);
                if (new_s != null) {
                    const old_s: U.O<Set<S.CollidableSprite>> = reports.get(k);
                    if (old_s != null) {
                        reports.set(k, new Set<S.CollidableSprite>([...old_s, ...new_s]));
                    }
                    else {
                        reports.set(k, new_s);
                    }
                    // D.log(`get_reports(): ${new_s.size} + ${old_s?.size ?? 0} = ${reports.get(k)?.size ?? 0}`);
                }
            }
        });
        return reports;
    }

    clear() {
        this.visit_bins((bin: Bin) => {
            bin.clear();
        });
    }

    private create() {
        this.bins = [];
        const row_count = Math.ceil(G.rect_h(this.bounds) / this.bin_size.y);
        const col_count = Math.ceil(G.rect_w(this.bounds) / this.bin_size.x);
        D.assert(row_count * this.bin_size.y >= G.rect_h(this.bounds));
        D.assert(col_count * this.bin_size.x >= G.rect_w(this.bounds));
        for (let r = 0; r < row_count; ++r) {
            this.bins[r] = [];
            for (let c = 0; c < col_count; ++c) {
                this.set_bin(r, c, new Bin());
            }
        }
    }
}
