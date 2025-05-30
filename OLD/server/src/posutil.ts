/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from './geom';

export function near_enough(a: G.V2D, b: G.V2D, e: number=1): boolean {
    const d = G.v2d_sub(a, b);
    const m = G.v2d_len(d);
    return Math.abs(m) <= Math.abs(e);
}

