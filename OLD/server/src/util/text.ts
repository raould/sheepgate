/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from '../geom';
import * as U from '../util/util';
import * as D from '../debug';
import * as _ from 'lodash';

// todo: add utilities to render multiline text.

// todo: utterly horrible hackiness herein to approximately/guess measure.

const MEASURE_SCALE_HACK = 11 / 30;

export function measure_text(text: string, font_size: number): G.V2D {
    const h = text.length * MEASURE_SCALE_HACK * font_size;
    const v = font_size * 0.8;
    return G.v2d_mk(h, v);
}

// ascii rez-derez. big hack.
// todo: want these to be by density a la ascii art.

const symbols = [
    ...U.range_cc(33, 47),
    ...U.range_cc(58, 64),
    ...U.range_cc(91, 96),
    ...U.range_cc(123, 126),
];
const numbers = [...U.range_cc(48, 57)];
const lower_case = [...U.range_cc(97, 122)];
const upper_case = [...U.range_cc(65, 90)];
const rez = [
    " ",
    "|", "/", "-", "\\", "|", "/", "-", "\\", "|", "/", "-", "\\", "|", "/", "-", "\\", 
    ...symbols.map(c => String.fromCharCode(c)),
    ...lower_case.map(c => String.fromCharCode(c)),
    ...numbers.map(c => String.fromCharCode(c)),
    ...upper_case.map(c => String.fromCharCode(c)),
];

function rez_index(char: string): number {
    const found = _.findLastIndex(rez, (e) => e == char);
    return Math.max(0, found);
}

export function rez_text(text: string, t: number): string {
    const src = text.split('');
    const dst = src.slice();
    const max = src.reduce((a, e) => Math.max(a, e.charCodeAt(0)), 1);
    // todo: heaven knows if maybe this can sometimes fail to get to the end character.
    for (let i = 0; i < src.length; ++i) {
        const rel = text.charCodeAt(i) / max;
        const end = rez_index(src[i]);
        const ti = Math.floor(Math.min(end, U.lerp(0, end, t * rel)));
        dst[i] = rez[ti];
    }
    return dst.join('');
}
