import * as Rnd from './random';
import * as U from './util/util';
import * as F from './facing';
import * as _ from 'lodash';

// i know it is kinda dumb to be reinventing these wheels.
// todo: none of this is unit tested. so a lot might be borken.
// match: this has (0,0) at top left of the screen.
// note: yes, at this point, some/a lot
// of these functions aren't actually used.
// todo: i want a programming language environment where i can 
// easily define a library that does everything as im/mutable, and
// then automagically derives the opposite im/mutable implementation!!!

export function wrap_x(x: number, bounds0: V2D): number {
    let x2 = x % bounds0.x;
    if (x2 < 0 || x2 < -0) { x2 = Math.abs(x2 + bounds0.x); }
    return x2;
}

export function smallest_diff_wrapped(a: number, b: number, range: number): number {
    // todo: something more compact via modular arithmetic?
    const d1 = Math.abs(a - b);
    const d2 = Math.abs((a + range) - b);
    const d3 = Math.abs(a - (b + range));
    return Math.min(d1, d2, d3);
}

// ---------- V2D: vector 2d.
export interface V2D {
    x: number; y: number;
}
export function v2d_toS(v: V2D): string {
    return `V2D(${v.x},${v.y})`;
}

export const v2d_left = v2d_mk(-1, 0);
export const v2d_right = v2d_mk(1, 0);
export const v2d_up = v2d_mk(0, -1);
export const v2d_down = v2d_mk(0, 1);
// note: explicitly making sure to not have any kind of 'unknown' hence bias of >= 0.
export function v2d_smells_left(v: V2D): boolean { return v.x < 0; }
export function v2d_smells_right(v: V2D): boolean { return v.x >= 0; }
export function v2d_smells_up(v: V2D): boolean { return v.y < 0; }
export function v2d_smells_down(v: V2D): boolean { return v.x >= 0; }

// todo: funny that i didn't yet make a _mk() or _clone() for rect or p2d.
export function v2d_mk(x: number, y: number): V2D {
    return { x: x, y: y };
}
export function v2d_mk_nn(n: number): V2D {
    return { x: n, y: n };
}
export function v2d_mk_x0(x: number): V2D {
    return v2d_mk(x, 0);
}
export function v2d_mk_0y(y: number): V2D {
    return v2d_mk(0, y);
}
export function v2d_mk_0(): V2D {
    return v2d_mk_nn(0);
}
export function v2d_mk_1(): V2D {
    return v2d_mk_nn(1);
}
export function v2d_x0(v: V2D): V2D {
    return v2d_mk(v.x, 0);
}
export function v2d_0y(v: V2D): V2D {
    return v2d_mk(0, v.y);
}
export function v2d_2_rect(bounds0: V2D): Rect {
    return rect_mk(v2d_mk_0(), bounds0);
}
export function v2d_0_mut(it: V2D) {
    it.x = 0;
    it.y = 0;
}
export function v2d_eq(va: V2D, vb: V2D, e: number = 1e-12): boolean {
    const d = v2d_len(v2d_sub(va, vb));
    return d <= e*e;
}
export function v2d_set(src: V2D, dst: V2D) {
    dst.x = src.x;
    dst.y = src.y;
}
export function v2d_set_x(v: V2D, x: number): V2D {
    return v2d_mk(x, v.y);
}
export function v2d_set_y(v: V2D, y: number): V2D {
    return v2d_mk(v.x, y);
}
export function v2d_set_x_mut(v: V2D, x: number) {
    v.x = x;
}
export function v2d_set_y_mut(v: V2D, y: number) {
    v.y = y;
}
export function v2d_clone(v: V2D): V2D {
    return v2d_mk(v.x, v.y);
}
export function v2d_deadzone(v: V2D, deadzone: V2D) {
    if (Math.abs(v.x) <= Math.abs(deadzone.x)) { v.x = 0; }
    if (Math.abs(v.y) <= Math.abs(deadzone.y)) { v.y = 0; }
}
export function v2d_max(a: V2D, b: V2D): V2D {
    return v2d_mk(
        Math.max(a.x, b.x),
        Math.max(a.y, b.y)
    );
}
export function v2d_len(v: V2D): number { // aka "mag", "manitude"
    return Math.sqrt(v.x * v.x + v.y * v.y);
}
export function v2d_len2(v: V2D): number { // actually len^2.
    return v.x * v.x + v.y * v.y;
}
export function v2d_norm(v: V2D): V2D {
    const len = Math.max(0.0001, v2d_len(v)); // arbitrary hack to avoid vanishing/exploding values.
    return v2d_mk(v.x / len, v.y / len);
}
export function v2d_add(a: V2D, b: V2D): V2D {
    return v2d_mk(a.x + b.x, a.y + b.y);
}
export function v2d_add_mut(a: V2D, b: V2D) {
    a.x += b.x;
    a.y += b.y;
}
export function v2d_sub(a: V2D, b: V2D): V2D {
    return v2d_mk(a.x - b.x, a.y - b.y);
}
export function v2d_sub_mut(a: V2D, b: V2D) {
    a.x -= b.x;
    a.y -= b.y;
}
export function v2d_scale(v: V2D, s: number): V2D {
    return v2d_mk(v.x * s, v.y * s);
}
export function v2d_scale_mut(v: V2D, s: number) {
    v.x *= s;
    v.y *= s;
}
export function v2d_scale_x(v: V2D, s: number): V2D {
    return v2d_mk(v.x * s, v.y);
}
export function v2d_scale_y(v: V2D, s: number): V2D {
    return v2d_mk(v.x, v.y * s);
}
export function v2d_scale_v2d(v: V2D, s: V2D): V2D {
    return v2d_mk(v.x * s.x, v.y * s.y);
}
export function v2d_dot(a: V2D, b: V2D): number {
    return a.x * b.x + a.y * b.y;
}
export function v2d_random_inxy(rnd: Rnd.Random, scale_x: number, scale_y: number): V2D {
    return v2d_mk(
        rnd.next_float_0_1() * scale_x,
        rnd.next_float_0_1() * scale_y
    )
}
export function v2d_random_around(rnd: Rnd.Random, center:V2D, half_bound:V2D): V2D {
    return v2d_mk(
        rnd.next_float_around(center.x, half_bound.x),
        rnd.next_float_around(center.y, half_bound.y)
    )
}
export function v2d_random_inrect(rnd: Rnd.Random, rect: Rect): V2D {
    return v2d_mk(
        rect.lt.x + rnd.next_float_0_1() * rect.size.x,
        rect.lt.y + rnd.next_float_0_1() * rect.size.y
    );
}
export function v2d_clip(v: V2D, min: V2D, max: V2D): V2D {
    return v2d_mk(
        U.clip(v.x, min.x, max.x),
        U.clip(v.y, min.y, max.y)
    );
}
export function v2d_bound(v: V2D, r: Rect): V2D {
    return v2d_mk(
        U.clip(v.x, rect_l(r), rect_r(r)),
        U.clip(v.y, rect_t(r), rect_b(r))
    );
}
export function v2d_bound_around(v: V2D, center: V2D, max_distance: V2D): V2D {
    return v2d_mk(
        U.clip(v.x, center.x - max_distance.x, center.x + max_distance.x),
        U.clip(v.y, center.y - max_distance.y, center.y + max_distance.y)
    );
}
export function v2d_abs_max_coord(v: V2D): number {
    return Math.max(Math.abs(v.x), Math.abs(v.y));
}
export function v2d_abs_min_coord(v: V2D): number {
    return Math.min(Math.abs(v.x), Math.abs(v.y));
}
export function v2d_abs_max(v: V2D, max: V2D) {
    return v2d_mk(
        U.clip(v.x, -Math.abs(max.x), Math.abs(max.x)),
        U.clip(v.y, -Math.abs(max.y), Math.abs(max.y))
    );
}
export function v2d_perp_cw(v: V2D): V2D {
    return v2d_mk(v.y, -v.y);
}
export function v2d_perp_anti_cw(v: V2D): V2D {
    return v2d_mk(-v.y, v.x);
}
// figure out which direction is shortest line to 'dst', considering world wrap.
// the returned vector is not normalized.
export function v2d_shortest_vec(src: V2D, dst: V2D, bounds0: V2D): V2D {
    const d0 = v2d_sub(dst, src);
    const bx0 = v2d_x0(bounds0);
    const dleft = v2d_sub(v2d_sub(dst, bx0), src);
    const dright = v2d_sub(v2d_add(dst, bx0), src);
    // todo: would be nice to have a V2D^2 type for static checking instead of 'hungarian'.
    const d0_len2 = v2d_len2(d0);
    const dleft_len2 = v2d_len2(dleft);
    const dright_len2 = v2d_len2(dright);
    if (U.a_lteq(dleft_len2, d0_len2, dright_len2)) {
        return dleft;
    }
    if (U.a_lteq(dright_len2, dleft_len2, d0_len2)) {
        return dright;
    }
    return d0;
}
export function v2d_shortest_normal(src: V2D, dst: V2D, bounds0: V2D): V2D {
    return v2d_norm(v2d_shortest_vec(src, dst, bounds0));
}
export function v2d_wrapH(v: V2D, bounds0: V2D): V2D {
    return v2d_mk(wrap_x(v.x, bounds0), v.y);
}
export function v2d_slope(va: V2D, vb: V2D): number {
    const diff = v2d_sub(vb, va);
    if (Math.abs(diff.x) == 0) { return Number.MAX_SAFE_INTEGER; }
    return diff.y / diff.x;
}
export function v2d_inside_rect(v: V2D, r: Rect): boolean {
    if (v.x < rect_l(r)) { return false; }
    if (v.x > rect_r(r)) { return false; }
    if (v.y < rect_t(r)) { return false; }
    if (v.y > rect_b(r)) { return false; }
    return true;
}
export function v2d_inside_x(v: V2D, a: V2D, b: V2D): boolean {
    let min_x = Math.min(a.x, b.x);
    let max_x = Math.max(a.x, b.x);
    return v.x >= min_x && v.x <= max_x;
}
// no checking, you will get NaN and other hell if src is (0,0) etc.
export function bounds2bounds(src: V2D, dst: V2D): V2D {
    return v2d_mk(
        dst.x / src.x,
        dst.y / src.y
    );
}

// ---------- P2D: particle 2d.
// yes, using is-a which might be... bad. sorry.
export interface P2D extends Rect {
    vel: V2D;
    acc: V2D;
    mass?: number;
}
export function p2d_toS(p: P2D): string {
    return `P2D(${v2d_toS(p.lt)},${v2d_toS(p.size)},${v2d_toS(p.vel)},${v2d_toS(p.acc)})`;
}
export function p2d_mk(r: Rect, vel: V2D, acc: V2D) {
    return {
        ...r,
        vel: vel,
        acc: acc
    };
}
export function p2d_0(): P2D {
    return p2d_mk(rect_mk_0(), v2d_mk_0(), v2d_mk_0());
}
export function p2d_set(src: P2D, dst: P2D) {
    rect_set(src, dst);
    v2d_set(src.vel, dst.vel);
    v2d_set(src.acc, dst.acc);
}
export function p2d_clone(p: P2D): P2D {
    return p2d_mk(
        rect_clone(p),
        v2d_clone(p.vel),
        v2d_clone(p.acc)
    )
}
export function p2d_0_mut(it: P2D) {
    v2d_0_mut(it.lt);
    v2d_0_mut(it.vel);
    v2d_0_mut(it.acc);
}
export function p2d_vel_corner(p: P2D, bounds0: V2D): V2D {
    let x = v2d_smells_left(p.vel) ? rect_l(p) : rect_r(p);
    let y = v2d_smells_up(p.vel) ? rect_t(p) : rect_b(p);
    return v2d_mk(wrap_x(x, bounds0), y);
}
export function p2d_add(a: P2D, b: P2D): P2D {
    const e2 = p2d_clone(a);
    v2d_add_mut(e2.lt, b.lt);
    v2d_add_mut(e2.vel, b.vel);
    v2d_add_mut(e2.acc, b.acc);
    return e2;
}
export function p2d_add_mut(a: P2D, b: P2D) {
    v2d_add_mut(a.lt, b.lt);
    v2d_add_mut(a.vel, b.vel);
    v2d_add_mut(a.acc, b.acc);
}
export function p2d_reverse_mut(p: P2D) {
    v2d_set(v2d_scale(p.acc, -1), p.acc);
    v2d_set(v2d_scale(p.vel, -1), p.vel);
}
export function p2d_reverse_x_mut(p: P2D) {
    p.acc.x = -p.acc.x;
    p.vel.x = -p.vel.x;
}

// ---------- Rect: rectangle 2d.
// unfortunately because there is only
// structural typing and no nominal typing,
// this is also going to be the ellipse 2d.
export interface Rect {
    lt: V2D;
    size: V2D;
}
export function rect_toS(r: Rect): string {
    return `Rect(${v2d_toS(r.lt)},${v2d_toS(r.size)})`;
}
export function rect_mk(lt: V2D, size: V2D): Rect {
    return {
        lt: lt,
        size: size
    };
}
export function rect_mk_lb(lb: V2D, size: V2D): Rect {
    const lt = v2d_sub(lb, v2d_0y(size));
    return {
        lt: lt,
        size: size
    };
}
export function rect_mk_rt(rt: V2D, size: V2D): Rect {
    const lt = v2d_sub(rt, v2d_x0(size));
    return {
        lt: lt,
        size: size
    };
}
export function rect_mk_rb(rb: V2D, size: V2D): Rect {
    const lt = v2d_sub(rb, size);
    return {
        lt: lt,
        size: size
    };
}
export function rect_eq(a: Rect, b: Rect): boolean {
    return v2d_eq(a.lt, b.lt) && v2d_eq(a.size, b.size);
}
export function rect_mk_corners(a: V2D, b: V2D): Rect {
    const minx = Math.min(a.x, b.x);
    const maxx = Math.max(a.x, b.x);
    const miny = Math.min(a.y, b.y);
    const maxy = Math.max(a.y, b.y);
    return {
        lt: v2d_mk(minx, miny),
        size: v2d_mk(maxx-minx, maxy-miny)
    }
}
export function rect_mk_0(): Rect {
    return rect_mk(v2d_mk_0(), v2d_mk_0());
}
export function rect_mk_centered(center: V2D, size: V2D): Rect {
    return {
        lt: v2d_sub(center, v2d_scale(size, 0.5)),
        size: size
    }
}
export function rect_outer_square(src: Rect): Rect { // todo: rect_inner_square()?
    const dim = Math.max(src.size.x, src.size.y);
    const mid = rect_mid(src);
    return {
        lt: {
            x: mid.x - dim/2,
            y: mid.y - dim/2
        },
        size: v2d_mk_nn(dim)
    };
}
export function rect_set_lt(rect: Rect, lt: V2D): Rect {
    return rect_mk(lt, rect.size);
}
export function rect_set_size(rect: Rect, size: V2D): Rect {
    return rect_mk(rect.lt, size);
}
export function rect_set_size_mut(rect: Rect, size: V2D) {
    rect.size = size;
}
export function rect_set(src: Rect, dst: Rect) {
    v2d_set(src.lt, dst.lt);
    v2d_set(src.size, dst.size);
}
export function rect_clone(r: Rect): Rect {
    return rect_mk(
        v2d_clone(r.lt),
        v2d_clone(r.size),
    );
}
// dimensions
export function rect_w(r: Rect): number { return r.size.x; }
export function rect_h(r: Rect): number { return r.size.y; }
// sides
export function rect_l(r: Rect): number { return r.lt.x; }
export function rect_t(r: Rect): number { return r.lt.y; }
export function rect_r(r: Rect): number { return r.lt.x + r.size.x; }
export function rect_b(r: Rect): number { return r.lt.y + r.size.y; }
// corners
export function rect_lt(r: Rect): V2D { return v2d_mk(rect_l(r), rect_t(r)); }
export function rect_rt(r: Rect): V2D { return v2d_mk(rect_r(r), rect_t(r)); }
export function rect_lb(r: Rect): V2D { return v2d_mk(rect_l(r), rect_b(r)); }
export function rect_rb(r: Rect): V2D { return v2d_mk(rect_r(r), rect_b(r)); }
// mid
export function rect_mt(r: Rect): V2D { return v2d_set_y(rect_mid(r), rect_t(r)); }
export function rect_mb(r: Rect): V2D { return v2d_set_y(rect_mid(r), rect_b(r)); }
export function rect_lm(r: Rect): V2D { return v2d_set_x(rect_mid(r), rect_l(r)); }
export function rect_rm(r: Rect): V2D { return v2d_set_x(rect_mid(r), rect_r(r)); }
export function rect_mid(r: Rect): V2D {
    return v2d_add(r.lt, v2d_scale(r.size, 0.5));
}    
export function rect_move(r: Rect, v: V2D): Rect {
    return rect_mk(
        v2d_add(r.lt, v),
        r.size
    );
}
export function rect_move_mut(r: Rect, v: V2D) {
    v2d_add_mut(r.lt, v);
}
export function rect_set_mid(r: Rect, m: V2D) {
    const r2 = rect_clone(r);
    rect_set_mid_mut(r2, m);
    return r2;
}
export function rect_set_mid_mut(r: Rect, m: V2D) {
    r.lt = v2d_sub(r.lt, v2d_sub(rect_mid(r), m));
}
export function rect_align(r_src: Rect, anchor_src: V2D, anchor_dest: V2D): Rect {
    return rect_move(r_src, v2d_sub(anchor_dest, anchor_src));
}
export function rect_scale_mid_v2d(r: Rect, scale: V2D): Rect {
    return rect_scale_v2d_anchor(
        r,
        scale,
        rect_mid(r)
    );
}
export function rect_scale_v2d(r: Rect, scale: V2D): Rect {
    return rect_mk(
        v2d_scale_v2d(r.lt, scale),
        v2d_scale_v2d(r.size, scale)
    );
}
export function rect_scale_v2d_anchor(r: Rect, scale: V2D, anchor: V2D): Rect {
    const lt0 = v2d_sub(r.lt, anchor);
    const lt0s = v2d_scale_v2d(lt0, scale);
    const lts = v2d_add(lt0s, anchor);
    return rect_mk(
        lts,
        v2d_scale_v2d(r.size, scale)
    );
}
export function rect_fit_in(src: Rect, dst: Rect): Rect {
    const sx = rect_w(dst) / rect_w(src);
    const sy = rect_h(dst) / rect_h(src);
    const s = Math.min(sx, sy);
    const scaled = rect_scale_mid_v2d(src, v2d_mk_nn(s));
    const dm = rect_mid(dst);
    const centered = rect_set_mid(scaled, dm);
    return centered;
}
export function min_radius(circle: Rect): number {
    return Math.min(circle.size.x, circle.size.y) / 2;
}
export function max_radius(circle: Rect): number {
    return Math.max(circle.size.x, circle.size.y) / 2;
}
function circle_mk(center: V2D, radius: number): Rect {
    const r2d = v2d_mk(radius, radius);
    return rect_mk(
        v2d_sub(center, r2d),
        v2d_scale(r2d, 2)
    );
}
export function rect_circle_inside(r: Rect): Rect {
    return circle_mk(rect_mid(r), Math.min(r.size.x, r.size.y));
}
export function rect_circle_outside(r: Rect): Rect {
    return circle_mk(rect_mid(r), Math.max(r.size.x, r.size.y));
}
export function rect_pad_v2d(r: Rect, pad: V2D): Rect {
    const anchor = rect_mid(r);
    const lt0 = v2d_sub(r.lt, anchor);
    const lt1 = v2d_add(lt0, v2d_scale(pad, -1));
    const lts = v2d_add(lt1, anchor);
    return rect_mk(
        lts,
        v2d_add(r.size, v2d_scale(pad, 2))
    );
}
export function rect_is_out_of_bounds0(e: Rect, bounds0: V2D): boolean {
    return rect_is_out_of_bounds(e, v2d_2_rect(bounds0));
}
export function rect_is_out_of_bounds(e: Rect, bounds: Rect): boolean {
    if (rect_l(e) > rect_r(bounds)) { return true; }
    if (rect_t(e) > rect_b(bounds)) { return true; }
    if (rect_r(e) < rect_l(bounds)) { return true; }
    if (rect_b(e) < rect_t(bounds)) { return true; }
    return false;
}
export function rects_are_overlapping(a: Rect, b: Rect): boolean {
    if (rect_l(a) > rect_r(b)) { return false; }
    if (rect_l(b) > rect_r(a)) { return false; }
    if (rect_t(a) > rect_b(b)) { return false; }
    if (rect_t(b) > rect_b(a)) { return false; }
    return true;
}
export function rects_are_overlapping_wrapH(src: Rect, dst: Rect, bounds0: V2D): boolean {
    const siblings = rect_siblingsH(src, v2d_2_rect(bounds0));
    return (
        rects_are_overlapping(siblings[0], dst) ||
        rects_are_overlapping(src, dst) ||
        rects_are_overlapping(siblings[1], dst)
    );
}
export function rect_siblingsH(src: Rect, bounds: Rect): [Rect, Rect] {
    return [
        rect_move(src, v2d_mk_x0(rect_w(bounds))),
        rect_move(src, v2d_mk_x0(-rect_w(bounds)))
    ];
}
export function rect_rhs(r: Rect): Rect { // "right hand side", right half.
    return rect_mk(
        v2d_add(r.lt, v2d_mk(r.size.x * 1/2, 0)),
        v2d_scale_v2d(r.size, v2d_mk(0.5, 1))
    );
}
export function rect_lhs(r: Rect): Rect { // "left hand side", left half.
    return rect_mk(
        v2d_clone(r.lt),
        v2d_scale_v2d(r.size, v2d_mk(0.5, 1))
    );
}
export function rect_mhs_h(r: Rect): Rect { // "middle hand side horizontal", +/- 0.25 around middle.
    return rect_mk(
        v2d_add(r.lt, v2d_mk(r.size.x * 1/4, 0)),
        v2d_scale_v2d(r.size, v2d_mk(0.5, 1))
    );
}
export function rect_mhs_v(r: Rect): Rect { // "middle hand side vertical", +/- 0.25 around middle.
    return rect_mk(
        v2d_add(r.lt, v2d_mk(0, r.size.y * 1/4)),
        v2d_scale_v2d(r.size, v2d_mk(1, 0.5))
    );
}
export function rect_align_lhs(r: Rect, bounds: Rect): Rect {
    return rect_move(
        r,
        v2d_sub(
            v2d_mk(rect_l(bounds), 0),
            v2d_mk(rect_l(r), 0)
        )
    )
}
export function rect_align_rhs(r: Rect, bounds: Rect): Rect {
    return rect_move(
        r,
        v2d_sub(
            v2d_mk(rect_r(bounds), 0),
            v2d_mk(rect_r(r), 0)
        )
    )
}
export function rect_wrapH(r: Rect, bounds0: V2D): Rect {
    const x2 = wrap_x(r.lt.x, bounds0);
    return rect_mk(
        v2d_mk(x2, r.lt.y),
        r.size
    );
}
export function rect_wrapH_mut(r: Rect, bounds0: V2D) {
    r.lt.x = wrap_x(r.lt.x, bounds0);
}
export function rect_wrapH_boundV_mut(r: Rect, bounds0: V2D) {
    const v = r.lt;
    v.x = wrap_x(r.lt.x, bounds0);
    let y2 = Math.min(bounds0.y-r.size.y, Math.max(0, v.y));
    v.y = y2;
}
export function rect_wrapH_clipV_mut(r: Rect, bounds0: V2D): boolean {
    const v = r.lt;
    v.x = wrap_x(r.lt.x, bounds0);
    const clip = v.y + r.size.y < 0 || v.y > bounds0.y;
    return clip;
}
export function rect_is_wrapH_clipV(r: Rect, bounds0: V2D): boolean {
    const v: V2D = v2d_clone(r.lt);
    v.x = wrap_x(r.lt.x, bounds0);
    const clip = v.y + r.size.y < 0 || v.y > bounds0.y;
    return clip;
}
export function rect_is_clipV(r: Rect, bounds0: V2D, pad: U.O<V2D>=undefined): boolean {
    if (rect_b(r) < -(pad?.y ?? 0)) {
        return true;
    }
    if (rect_t(r) > bounds0.y + (pad?.y ?? 0)) {
        return true;
    }
    return false;
}
export function rect_clip_inside(rect: Rect, bounds: Rect): U.O<Rect> {
    if (!rects_are_overlapping(rect, bounds)) {
        return undefined;
    }
    else {
        const l = Math.max(rect_l(rect), rect_l(bounds));
        const t = Math.max(rect_t(rect), rect_t(bounds));
        const r = Math.min(rect_r(rect), rect_r(bounds));
        const b = Math.min(rect_b(rect), rect_b(bounds));
        return rect_mk(
            v2d_mk(l, t),
            v2d_mk(r-l, b-t)
        );
    }
}
export function rect_clipH_inside(rect: Rect, bounds: Rect): U.O<Rect> {
    if (!rects_are_overlapping(rect, bounds)) {
        return undefined;
    }
    else {
        const l = Math.max(rect_l(rect), rect_l(bounds));
        const r = Math.min(rect_r(rect), rect_r(bounds));
        return rect_mk(
            v2d_mk(l, rect_t(rect)),
            v2d_mk(r-l, rect_h(rect))
        );
    }
}
export function rect_inset(r: Rect, inset: V2D): Rect {
    return rect_mk(
        v2d_add(r.lt, inset),
        v2d_sub(r.size, v2d_scale(inset, 2))
    )
}
export function rect_centered(src: Rect, outer: Rect): Rect {
    const om = rect_mid(outer);
    return rect_set_mid(src, om);
}

export function clone_shifted<T extends Rect>(src: T, dst: V2D, bounds0: V2D): T {
    // make a copy that is on the other side of src
    // so ie we can check collisions across world x wrapping.
    const src2 = _.cloneDeep(src);
    const sign = v2d_sub(dst, src2.lt).x < 0 ? -1 : 1;
    v2d_add_mut(src2.lt, v2d_scale(v2d_x0(bounds0), sign));
    return src2;
}

export function scale_ellipse_to_outer_circle(ellipse: Rect): V2D {
    let scale: V2D;
    if (ellipse.size.x > ellipse.size.y) {
        scale = v2d_mk(
            1,
            ellipse.size.x / ellipse.size.y
        );
    }
    else {
        scale = v2d_mk(
            ellipse.size.y / ellipse.size.x,
            1,
        );
    }
    return scale;
}

export enum Quadrant {
    lt,
    rt,
    lb,
    rb,
}

export function v2d_quadrant(p: V2D, anchor?: U.O<V2D>): Quadrant {
    let p2 = anchor == null ? p : v2d_sub(p, anchor);
    if (p2.x <= 0 && p2.y <= 0) {
        return Quadrant.lt;
    }
    if (p2.x <= 0 && p2.y > 0) {
        return Quadrant.lb;
    }
    if (p2.x > 0 && p2.y <= 0) {
        return Quadrant.rt;
    }
    else {
        return Quadrant.rb;
    }
}
