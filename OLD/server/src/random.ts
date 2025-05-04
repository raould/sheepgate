import * as U from './util/util';
import * as G from './geom';
import * as S from 'seedrandom';
import * as D from './debug';

export interface Random {
    // note: constructor should take a (seed: number).
    // note: the argument "non_zero?"=true must force returned values to never be zero
    // to help avoid things like division by zero errors.

    // either true or false.
    next_boolean(): boolean;
    
    // either -1 or 1.
    next_sign(): number;

     // [0,1) like javascript.
    next_float_0_1(non_zero?:boolean): number;

     // [-1,1).
    next_float_neg1_1(non_zero?:boolean): number;

     // [min,max).
    next_float_range(min: number, max: number, non_zero?:boolean): number;
    next_int_range(min: number, max: number, non_zero?:boolean): number;

    // [center-half_bound,center+half_bound).
    next_float_around(center: number, half_bound: number, non_zero?:boolean): number;

    next_array_item<T>(items: T[]): U.O<T>;

    next_dict_item<T>(items: U.Dict<T>): U.O<T>;

    // [min,max).
    next_v2d_around(center: G.V2D, bounds: G.V2D): G.V2D;

    // [min, max).
    next_v2d_inside_rect(rect: G.Rect): G.V2D;

    // n values in [min, max).
    generate_n_float_range(count: number, min: number, max: number, non_zero?:boolean): number[];
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
        !!this.trace && D.log(seed, thiseed);
    }
    private next_double(): number {
        const d = this.s.double();
        !!this.trace && D.log(d);
        return d;
    }
    next_boolean(chance: number = 0.5): boolean {
        return this.next_double() < chance;
    }
    next_sign(): number {
        return this.next_boolean() ? 1 : -1;
    }
    next_float_0_1(non_zero:boolean=false): number {
        const n = this.next_double();
        return return_non_zero(n, non_zero, 1);
    }
    next_float_neg1_1(non_zero:boolean=false): number {
        const n = this.next_double() * 2 - 1;
        return return_non_zero(n, non_zero, 1);
    }
    next_float_range(min: number, max: number, non_zero:boolean=false): number {
        const n = min + this.next_double() * (max-min);
        return return_non_zero(n, non_zero, Math.sign(n));
    }
    next_int_range(min: number, max: number, non_zero:boolean=false): number {
	const f = this.next_float_range(min, max, non_zero);
	return Math.floor(f);
    }
    next_float_around(center: number, half_bound: number, non_zero:boolean=false): number {
        const n = this.next_float_neg1_1() * half_bound + center;
        return return_non_zero(n, non_zero, Math.sign(n));
    }
    next_array_item<T>(items: T[]): U.O<T> {
        if (items.length == 0) { return undefined; }
        const i =
        Math.min(items.length-1,
            Math.max(0,
                // since at least javascript's default random is [0,1)
                // instead of doing -1 we floor it to be paranoid about overrun.
                Math.floor(this.next_float_0_1() * (items.length))
            )
        );
        return items[i];
    }
    next_dict_item<T>(items: U.Dict<T>): U.O<T> {
        return this.next_array_item(Object.values(items));
    }
    next_v2d_around(center: G.V2D, half_bound: G.V2D): G.V2D {
        return G.v2d_mk(
            this.next_float_around(center.x, half_bound.x),
            this.next_float_around(center.y, half_bound.y),
        );
    }
    next_v2d_inside_rect(r: G.Rect): G.V2D {
        return G.v2d_mk(
            this.next_float_range(G.rect_l(r), G.rect_r(r)),
            this.next_float_range(G.rect_t(r), G.rect_b(r))
        );
    }
    generate_n_float_range(count: number, min: number, max: number, non_zero?:boolean): number[] {
        return Array.from({length: count}, e => this.next_float_range(min, max, non_zero));
    }
}

export const singleton = new RandomImpl();
