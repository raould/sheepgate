import * as D from '../debug';
import * as Rnd from '../random';

// todo: uh, tests?
// todo: share this with client, probably.
// todo: some of these utils aren't ever used, consider deleting them.

// i hate floating point.
export function sign(x: number): number {
    if (x == -0) { return 0; }
    else { return Math.sign(x); }
}

export function is_zero(n: number): boolean {
    return n == 0 || n == -0;
}

export type O<T> = T | undefined;
export function isU(a: any): boolean { return a == undefined; }
export function exists<T>(val: T | undefined | null): val is T {
    return val !== undefined && val !== null;
}
export function unreachable(_: unknown): never {
    throw new Error("unreachable");
}

export function F2D(n: number): number {
    return Math.round((Number.EPSILON+n)*100)/100;
}

// your fault if the array is empty!
export function last<T>(array: Array<T>, offset: number=0): T {
    let index = array.length - 1 - offset;
    return array[index];
}

export function lastO<T>(array: Array<T>, offset: number=0): O<T> {
    let index = array.length - 1 - offset;
    if (index >= 0) {
        return array[index];
    }
    return undefined;
}

export function firstO<T>(array: Array<T>): O<T> {
    if (array.length > 0) {
        return array[0];
    }
    return undefined;
}

// i don't know if one generator can call another generator cleanly
// in which case i could abstract out the commonalities here. :-?
export function* range_co(start: number, end: number): IterableIterator<number> {
    const diff = start <= end ? 1 : -1;
    yield start;
    if (start == end - diff) return;
    yield* range_co(start + diff, end);
}

export function* range_cc(start: number, end: number): IterableIterator<number> {
    const diff = start <= end ? 1 : -1;
    yield start;
    if (start == end) return;
    yield* range_cc(start + diff, end);
}

export interface FilteredArray<E> {
    kept: Array<E>;
    removed: Array<E>;
}

export function filter_array<E>(array: Array<E>, fn: (_: E) => boolean): FilteredArray<E> {
    const f: FilteredArray<E> = { kept: [], removed: [] };
    for (const e of array) {
        if (fn(e)) {
            f.kept.push(e);
        }
        else {
            f.removed.push(e);
        }
    }
    return f;
}

export function shuffle_array<E>(array: Array<E>, rnd: Rnd.Random = Rnd.singleton): Array<E> {
    const a2 = array.slice();
    for (let i = a2.length - 1; i > 0; --i) {
	const j = Math.floor(rnd.float_0_1() * (i+1));
	const ti = a2[i];
	const tj = a2[j];
	a2[i] = tj;
	a2[j] = ti;
    }
    return a2;
}

// todo: this is an over simplification in that
// the only thing we use are Objects
// and you'd have to use things like
// Object.keys() on your dict.
// but i couldn't find a type like this in typescript
// so i had to make my own for use in e.g. methods below.
export interface Dict<E> { 
    [key: string]: E;
}

// omfexpletiveg i so utterly effing hate javascript.
export function count_dict(d: O<Dict<any>>): number {
    return d == null ? 0 : Object.keys(d).length;
}

export function add_self_dict(d: Dict<any>, kv: any) {
    d[kv] = kv;
}

export interface FilteredDict<E> {
    kept: Dict<E>;
    removed: Dict<E>;
}

export function filter_dict<E>(dict: Dict<E>, fn: (_: string, __: E) => boolean): FilteredDict<E> {
    const f: FilteredDict<E> = { kept: {}, removed: {} };
    for (const [k, v] of Object.entries(dict)) {
        if (fn(k, v)) {
            f.kept[k] = v;
        }
        else {
            f.removed[k] = v;
        }
    }
    return f;
}

export type ValueMkType<T> = () => Set<T>;
export function get_or_mk_dict<T>(dict: { [k: string]: Set<T> }, key: string, value_mk_fn: ValueMkType<T>): Set<T> {
    if (dict[key] == null) {
        dict[key] = value_mk_fn();
    }
    return dict[key];
}
export function get_or_mk_map<K, T>(dict: Map<K, Set<T>>, key: K, value_mk_fn: ValueMkType<T>): Set<T> {
    if (dict.get(key) == null) {
        dict.set(key, value_mk_fn());
    }
    return dict.get(key)!;
}

// todo: I want to use ValueMkType<T> here but dunno how. :-(
export function set_mk<T>() {
    return new Set<T>();
}

export function sane_fps(fps: number): number {
    return clip(fps, 10, 60);
}

export function count_digits(n: number): number {
    return n.toString().length;
}

export function lerp(a: number, b: number, t: number): number {
    const t2 = (a < b) ? t : (1-t);
    return clip(
        (t2 * (b-a)) + a,
        a,
        b
    );
}

export function t01(min: number, max: number, n: number): number {
    D.assert(min <= max);
    return clip01((n - min) / (max - min));
}

export function t10(min: number, max: number, n: number): number {
    return 1 - t01(min, max, n);
}

export function clip01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

export function clip(n: number, a: number, b: number): number {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    return Math.max(min, Math.min(max, n));
}

export function round(n: number, step: number): number {
    return Math.round(n/step) * step;
}

export function precision(n: number, p: number): number {
    const scale = 10 ** p;
    return Math.floor(scale * n) / scale;
}

type LNOTNIL<T,R> = (t:T)=>R
type LNIL<R> = (()=>R);

export function if_let<T,R>(ot:O<T>, nonnil:LNOTNIL<T,R>): O<R> {
    if (ot != null) {
        return nonnil(ot!);
    }
    return undefined;
}

export function if_let_safe<T,R>(ot:O<T>, nonnil:LNOTNIL<T,R>, nil:LNIL<R>): R {
    if (ot != null) {
        return nonnil(ot!);
    }
    return nil();
}

// if_let"s" as in plural. all the os's have to be non-nil for it to call nonnil().
// todo: i wish the LSNOTNIL type was more specific. :-(
type LSNOTNIL = (t:any)=>void;
type LSNIL = ()=>void;
export function if_lets(os:any[], nonnil:LSNOTNIL, nil:O<LSNIL>=undefined): void {
    if (os.filter(o => o == null).length == 0) {
        nonnil(os.map(o => o!));
    }
    else if (nil != null) {
        nil();
    }
}

export function index_looped(length: number, index: number): number {
    if (length == 0) {
        return 0;
    }
    else {
        const imod = index % length;
        const wrapped = index < 0 ? (length + imod) : imod;
        return wrapped;
    }
}

export function next_index_looped(array: any[], index: number): number {
    // your own damn fault if the array is empty or == null
    // in which case you get NaN back from "%".
    return index_looped(array.length, index+1);
}

export function element_looped<T>(array: T[], index: number): O<T> {
    if (array.length == 0) { return undefined; }
    return array[index_looped(array.length, index)];
}

export function element_random<T>(array: T[], rnd: Rnd.Random = Rnd.singleton): O<T> {
    if (array.length == 0) { return undefined; }
    const index = rnd.next_int(array.length);
    return array[index_looped(array.length, index)];
}

export function a_lteq(a: number, ...numbers: number[]): boolean {
    return numbers.every(n => a <= n);
}

export function is_asc(a: number, b: number): boolean {
    return a <= b;
}

export function is_desc(a: number, b: number): boolean {
    return a >= b;
}

export function is_sorted(a: number[], compare_fn: (a: number, b: number)=>boolean): boolean {
    if (a == null) {
        return false;
    }
    const is = a.reduce((r:boolean, e:number, i:number) => {
        return i < 1 ? true : (r || compare_fn(e, a[i-1]));
    }, false);
    return is;
}

export function has_bits(src: O<number>, query: number): boolean {
    if (src == null || is_zero(src) || is_zero(query)) {
        return false;
    }
    return (src & query) != 0;
}

export function has_bits_eq(src: O<number>, query: number): boolean {
    if (src == null) {
        return false;
    }
    if (is_zero(query)) {
        return is_zero(src);
    }
    return (src & query) == query;
}

export function number2binstr(n: number): string {
    return (n >>> 0).toString(2);
}

// https://stackoverflow.com/questions/55479658/how-to-create-a-type-excluding-instance-methods-from-a-class-in-typescript
type FlagExcludedType<Base, Type> = { [Key in keyof Base]: Base[Key] extends Type ? never : Key };
type AllowedNames<Base, Type> = FlagExcludedType<Base, Type>[keyof Base];
type OmitType<Base, Type> = Pick<Base, AllowedNames<Base, Type>>;
// todo: this whole FieldsOnly attempt didn't really work out very well ux-wise.
export type FieldsOnly<T> = OmitType<T, Function>;
export type Diff<T, U> = T extends U ? never : T;
export interface Flavoring<FlavorT> {
    _type?: FlavorT;
}
export type Flavor<T, FlavorT> = T & Flavoring<FlavorT>;

export function dump(v: any): string {
    return JSON.stringify(v);
}
    
export function stringify(v: any): string {
    return JSON.stringify(v);
}

// use this to debug cycles. i hate javascript.
export function findCycles(v: any): string {
    const seen = new WeakSet();
    const j = JSON.stringify(
        v,
        (key, value) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    console.log("duplicate: ", key, value);
                    return;
                }
                seen.add(value);
            }
            return value;
        }
    );
    return j;
}
