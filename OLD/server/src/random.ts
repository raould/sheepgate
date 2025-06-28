/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as U from './util/util';
import * as G from './geom';
import * as S from 'seedrandom';
import * as D from './debug';

// todo: remove all the leading "next_" boilerplate.
// todo: rename 'singleton' to something shorter e.g. 'inst'.

export interface Random {
    // note: constructor should take a (seed: number).
    // note: the argument "non_zero?"=true must force returned values to never be zero
    // to help avoid things like division by zero errors.

    // either true or false.
    boolean(chance?: number /*=0.5*/): boolean;

    // either -1 or 1.
    sign(): number;

     // [0,1) like javascript.
    float_0_1(non_zero?: boolean): number;

     // [-1,1).
    float_neg1_1(non_zero?: boolean): number;

     // [min,max).
    float_range(min: number, max: number, non_zero?: boolean): number;
    int_range(min: number, max: number, non_zero?: boolean): number;

    // [center-half_bound,center+half_bound).
    float_around(center: number, half_bound: number, non_zero?: boolean): number;
    // [center-half_bound,center+half_bound).
    int_around(center: number, half_bound: number, non_zero?: boolean): number;
    // [min,max).
    v2d_around(center: G.V2D, bounds: G.V2D): G.V2D;

    choose<T>(...ts: T[]): U.O<T>;

    array_item<T>(items: T[]): U.O<T>;

    dict_item<T>(items: U.Dict<T>): U.O<T>;

    // [min, max).
    v2d_inside_rect(rect: G.Rect): G.V2D;

    // n values in [min, max).
    generate_n_float_range(count: number, min: number, max: number, non_zero?: boolean): number[];
}

function return_non_zero(n: number, non_zero: boolean, sign: number): number {
    if (!!non_zero && n == 0) {
        return Number.EPSILON * sign;
    }
    else {
        return n;
    }
}

export class RandomImpl implements Random {
    s: S.prng;
    constructor(seed?: number, private readonly trace: boolean = false) {
        const thiseed = seed || Date.now();
        this.s = S.xorshift7(thiseed.toString());
        this.trace && D.log(seed, thiseed);
    }
    private double(): number {
        const d = this.s.double();
        this.trace && D.log(d);
        return d;
    }
    boolean(chance: number = 0.5): boolean {
        return this.double() < chance;
    }
    sign(): number {
        return this.boolean() ? 1 : -1;
    }
    float_0_1(non_zero:boolean=false): number {
        const n = this.double();
        return return_non_zero(n, non_zero, 1);
    }
    float_neg1_1(non_zero:boolean=false): number {
        const n = this.double() * 2 - 1;
        return return_non_zero(n, non_zero, 1);
    }
    float_range(min: number, max: number, non_zero:boolean=false): number {
        const n = min + this.double() * (max-min);
        return return_non_zero(n, non_zero, Math.sign(n));
    }
    int_range(min: number, max: number, non_zero:boolean=false): number {
	const f = this.float_range(min, max, non_zero);
	return Math.floor(f);
    }
    float_around(center: number, half_bound: number, non_zero:boolean=false): number {
        const n = this.float_neg1_1() * half_bound + center;
        return return_non_zero(n, non_zero, Math.sign(n));
    }
    int_around(center: number, half_bound: number, non_zero:boolean=false): number {
	return Math.round(this.float_around(center, half_bound, non_zero));
    }
    choose<T>(...ts: T[]): U.O<T> {
	const n = this.int_range(0, ts.length);
	return ts[n];
    }
    array_item<T>(items: T[]): U.O<T> {
        if (items.length == 0) { return undefined; }
	const i = U.clip(
	    Math.floor(this.float_0_1() * items.length),
	    0,
	    items.length-1
	);
        return items[i];
    }
    dict_item<T>(items: U.Dict<T>): U.O<T> {
        return this.array_item(Object.values(items));
    }
    v2d_around(center: G.V2D, half_bound: G.V2D): G.V2D {
        return G.v2d_mk(
            this.float_around(center.x, half_bound.x),
            this.float_around(center.y, half_bound.y),
        );
    }
    v2d_inside_rect(r: G.Rect): G.V2D {
        return G.v2d_mk(
            this.float_range(G.rect_l(r), G.rect_r(r)),
            this.float_range(G.rect_t(r), G.rect_b(r))
        );
    }
    generate_n_float_range(count: number, min: number, max: number, non_zero: boolean=false): number[] {
        return Array.from({length: count}, _ => this.float_range(min, max, non_zero));
    }
}

export const singleton = new RandomImpl();

export class RandomBoolDuration {
    latchedTime: number | undefined;
    calmTime: number | undefined;
    constructor(
	private chance: number,
	private latchDuration: number,
	private calmDuration: number = 0 ) {}
    test(now: number): boolean {
        if (U.exists(this.latchedTime)) {
            if (now - this.latchedTime > this.latchDuration) {
                this.latchedTime = undefined;
		this.calmTime = now;
            }
        }
        else if (now - (this.calmTime??0) >= this.calmDuration && singleton.boolean(this.chance)) {
	    this.calmTime = undefined;
	    this.latchedTime = now;
	}
        return U.exists(this.latchedTime);
    };
}
