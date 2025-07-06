/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import { RGBA } from './color';
import * as G from './geom';
import * as S from './sprite';
import * as Rnd from './random';

const _rnd = new Rnd.RandomImpl();

// todo: all Drawings should support lifetime & fade.

// note: z-order in each array is [back...front].
// todo: this is bad because it only supports
// z-ordering within each type of array. ideally
// we'd have 1 heterogenious array, however then
// we'd also have to have some kind of instanceof
// which gets really bloody annoyingly redundant
// in typescript especially with interfaces.

export interface Drawing {
    // match: for now, we expect rects to always be drawn first by the client.
    other?: Drawing;
    rects: DrawRect[];
    lines: DrawLine[];
    ellipses: DrawEllipse[];
    arcs: DrawArc[];
    texts: DrawText[];
    images: DrawImage[];
}

export function drawing_mk(): Drawing {
    return {
        rects: [],
        lines: [],
        ellipses: [],
        arcs: [],
        texts: [],
        images: [],
    };
}

export function sizzlerLine_mk(
    draw_line: DrawLine,
    segment_count: number,
    sizzle_width: number,
    rnd: Rnd.Random=_rnd
): DrawLine[] {
    const lines: DrawLine[] = [];
    segment_count = Math.max(1, segment_count);
    const v = G.v2d_sub(draw_line.p1, draw_line.p0);
    const step = G.v2d_scale(v, 1/segment_count);
    const p = G.v2d_scale(G.v2d_norm(G.v2d_perp_anti_cw(v)), sizzle_width);
    let c0 = draw_line.p0;
    for (let i = 1; i < segment_count-1; ++i) {
        const c1 = G.v2d_add(
            draw_line.p0,
            G.v2d_scale(step, i)
        );
        const o = G.v2d_scale(
            p,
            rnd.float_neg1_1() * sizzle_width
        );
        const c1o = G.v2d_add(c1, o);
	lines.push({
            ...draw_line,
            p0: c0,
            p1: c1o
        });
        c0 = c1o;
    }
    lines.push({
        ...draw_line,
        p0: c0,
        p1: draw_line.p1
    });
    return lines;
}

export function addSizzlerLine(
    drawing: Drawing,
    draw_line: DrawLine,
    segment_count: number,
    sizzle_width: number,
    rnd: Rnd.Random=_rnd
) {
    drawing.lines.push(
	...sizzlerLine_mk(
	    draw_line,
	    segment_count,
	    sizzle_width,
	    rnd
	)
    );
}

export function addSizzlerRect(drawing: Drawing, drawRect: DrawRect, segment_count: number, sizzle_width: number, rnd: Rnd.Random=_rnd) {
    const defs = { color: drawRect.color, line_width: drawRect.line_width ?? 1, wrap: drawRect.wrap };
    addSizzlerLine(
	drawing,
	{
	    ...defs,
	    p0: G.rect_lt(drawRect.rect),
	    p1: G.rect_rt(drawRect.rect),
	},
	segment_count, sizzle_width, rnd
    );
    addSizzlerLine(
	drawing,
	{
	    ...defs,
	    p0: G.rect_rt(drawRect.rect),
	    p1: G.rect_rb(drawRect.rect),
	},
	segment_count, sizzle_width, rnd
    );
    addSizzlerLine(
	drawing,
	{
	    ...defs,
	    p0: G.rect_rb(drawRect.rect),
	    p1: G.rect_lb(drawRect.rect),
	},
	segment_count, sizzle_width, rnd
    );
    addSizzlerLine(
	drawing,
	{
	    ...defs,
	    p0: G.rect_lb(drawRect.rect),
	    p1: G.rect_lt(drawRect.rect),
	},
	segment_count, sizzle_width, rnd
    );
}

// this is where structural typing sucks: vs. DrawEllipse.
export interface DrawRect {
    wrap: boolean;
    color: RGBA;
    // match: the client will only either outline or fill, not both.
    line_width?: number;
    is_filled?: boolean;
    rect: G.Rect;
    comment?: string;
}

export interface DrawLine {
    wrap: boolean;
    color: RGBA; // both/either line & fill color.
    line_width: number;
    p0: G.V2D;
    p1: G.V2D;
}

// this is where structural typing sucks: vs. DrawRect.
export interface DrawEllipse {
    wrap: boolean;
    color: RGBA;
    // match: the client will only either outline or fill, not both.
    line_width?: number;
    is_filled?: boolean;
    bounds: G.Rect;
    comment?: string;
}

export interface DrawArc {
    wrap: boolean;
    color: RGBA;
    // match: the client will only either outline or fill, not both.
    line_width?: number;
    is_filled?: boolean;
    bounds: G.Rect;
    radians_start: number;
    radians_end: number;
    comment?: string;
}

export interface DrawText {
    wrap: boolean;
    lb: G.V2D;
    font: string;
    fillStyle: RGBA;
    text: string;
    comment?: string;
}

export interface DrawImage {
    wrap: boolean;
    image_located: S.ImageLocated;
    comment?: string;
}
