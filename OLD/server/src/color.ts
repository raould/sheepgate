/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as U from './util/util';
import * as Rnd from './random';
import * as D from './debug';
import * as CC from 'color-convert';

// todo: the HSV <-> RGB apis aren't very clean or complete.
// todo: we're coupled with the HSV format/type that color-convert uses.
export type HSV = [number, number, number];

export function convert1to255(n: number): number {
    return Math.floor(Math.max(0, Math.min(255, n*255)));
}
export function convert255to1(n: number): number {
    return Math.max(0, Math.min(1, n/255));
}

export class RGBA {
    static RED = RGBA.new01(1, 0, 0);
    static DARK_RED = RGBA.new01(0.15, 0, 0);
    static GREEN = RGBA.new01(0, 1, 0);
    static DARK_GREEN = RGBA.new01(0, 0.15, 0);
    static BLUE = RGBA.new01(0, 0, 1);
    static DARK_BLUE = RGBA.new01(0, 0, 0.15);
    static CYAN = RGBA.new01(0, 1, 1);
    static DARK_CYAN = RGBA.new01(0, 0.15, 0.15);
    static MAGENTA = RGBA.new01(1, 0, 1);
    static DARK_MAGENTA = RGBA.new01(0.15, 0, 0.15);
    static YELLOW = RGBA.new01(1, 1, 0);
    static DARK_YELLOW = RGBA.new01(0.15, 0.15, 0);
    static BLACK = RGBA.new01(0, 0, 0);
    static WHITE = RGBA.new01(1, 1, 1);
    static GRAY = RGBA.new01(0.5, 0.5, 0.5);
    static DARK_GRAY = RGBA.new01(0.15, 0.15, 0.15);
    static CYCLES = [
        RGBA.RED,
        RGBA.MAGENTA,
        RGBA.BLUE,
        RGBA.CYAN,
        RGBA.GREEN,
        RGBA.YELLOW,
    ];

    r01: number;
    g01: number;
    b01: number;
    a01: number;
    hex: string;

    public static randomRGB(r: Rnd.RandomImpl): RGBA {
        return new RGBA(
            r.float_0_1(),
            r.float_0_1(),
            r.float_0_1(),
            1
        );
    }

    public static lerpRGBA(a: RGBA, b: RGBA, t01: number): RGBA {
        return new RGBA(
            U.lerp(a.r01, b.r01, t01),
            U.lerp(a.g01, b.g01, t01),
            U.lerp(a.b01, b.b01, t01),
            U.lerp(a.a01, b.a01, t01),
        )
    }

    public static new01(r01: number, g01: number, b01: number, a01: number = 1): RGBA {
        return new RGBA(r01, g01, b01, a01);
    }

    public static new0255(r0255: number, g0255: number, b0255: number, a0255: number = 255): RGBA {
        return new RGBA(
            convert255to1(r0255),
            convert255to1(g0255),
            convert255to1(b0255),
            convert255to1(a0255),
        );
    }

    public static newHSV(hsv: HSV) {
        const rgb = CC.hsv.rgb([hsv[0], hsv[1], hsv[2]]);
        return RGBA.new0255(rgb[0], rgb[1], rgb[2], 255); 
    }

    private constructor(r01: number, g01: number, b01: number, a01: number) {
        this.r01 = Math.max(0, Math.min(1, r01));
        if (r01 > 0) { D.assert(r01 * 255 > 0, `red value ${r01} is too small`); }
        this.g01 = Math.max(0, Math.min(1, g01));
        if (g01 > 0) { D.assert(g01 * 255 > 0, `green value ${g01} is too small`); }
        this.b01 = Math.max(0, Math.min(1, b01));
        if (b01 > 0) { D.assert(b01 * 255 > 0, `blue value ${b01} is too small`); }
        this.a01 = Math.max(0, Math.min(1, a01));
        if (a01 > 0) { D.assert(a01 * 255 > 0, `alpha value ${a01} is too small`); }
        this.hex = this.toHexString();
    }

    public setAlpha01(a01: number): RGBA {
        return new RGBA(
            this.r01,
            this.g01,
            this.b01,
            a01
        );
    }

    public toHSV(): HSV {
        return CC.rgb.hsv([this.r01*255, this.g01*255, this.b01*255]);
    }

    public toHexString(): string {
        const parts = [this.r01, this.g01, this.b01, this.a01]
            .map(c => convert1to255(c).toString(16).padStart(2, '0'))
        return "#" + parts.join("");
    }

    toJSON(): string {
        return this.hex;
    }
}

export class HCycle {
    // todo: for the text on screens i end up having
    // to use negative delta values to have the color cycling
    // go from top to bottom, unclear to me why.
    
    // todo: wugly: this next() returns HSV vs. the other next() returns RGB.
    public static next(hsv: HSV, delta: number): HSV {
        const hue_src = hsv[0];
        let hue_dst = (hue_src + delta) % 360
        if (hue_dst < 0) {
            hue_dst += 360;
        }
        return [hue_dst, hsv[1], hsv[2]];
    }

    public static newFromRed(delta: number = 1): HCycle {
        const hsv = RGBA.RED.toHSV();
        return new HCycle(hsv, delta);
    }

    public static newFromHCycle(header_cycle: HCycle): HCycle {
        return new HCycle(header_cycle.hsv, header_cycle.delta);
    }

    constructor(public hsv: HSV, public delta: number) {
    }

    current(): RGBA {
        const rgb = CC.hsv.rgb([this.hsv[0], this.hsv[1], this.hsv[2]]);
        return RGBA.new0255(rgb[0], rgb[1], rgb[2], 255); 
    }

    next(): RGBA {
        this.hsv = HCycle.next(this.hsv, this.delta);
        return this.current();
    }

    skip(delta: number): RGBA {
        this.hsv = HCycle.next(this.hsv, delta);
        return this.current();
    }
}
