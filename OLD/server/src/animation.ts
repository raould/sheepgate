/* Copyright (C) 2024-2026 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as S from './sprite';
import * as G from './geom';
import * as F from './facing';
import * as U from './util/util';
import * as Dr from './drawing';
import * as K from './konfig';
import * as D from './debug';

export function ease_in_out(t: number, n0: number, n1: number): number {
    if (t < 0) { return n0; }
    if (t > 1) { return n1; }
    const z = t < 0.5 ? 2*t : 2*(1-t);
    return z * z * (3 - z * 2) * (n1-n0) + n0;
}

export function vibrate_around_n(t: number, n: number, radius: number): number {
    if (t < 0) { return n; }
    if (t > 1) { return n; }
    const discounted = (1 - t) * radius;
    const v = Math.random() * discounted * 2;
    const centered = v - discounted;
    return n + centered;
}

export function lerp_1_inside_t_outside(pos: G.V2D, bounds: G.Rect, margin: number): number {
    if (G.v2d_inside_rect(pos, bounds)) {
        return 1;
    }
    else {
        const diff = Math.min(
            Math.abs(pos.x - G.rect_l(bounds)),
            Math.abs(pos.x - G.rect_r(bounds)),
            Math.abs(pos.y - G.rect_t(bounds)),
            Math.abs(pos.y - G.rect_b(bounds))
        );
        return U.clip01((margin - diff) / margin);
    }
}

export class TimedLooper<T> {
    constructor(private readonly array: T[], private readonly start_msec: number, private readonly frame_msec: number) {
        D.assert(array.length > 0);
    }

    value(now: number): U.O<T> {
        const duration = now - this.start_msec;
        const index = Math.floor(duration / this.frame_msec);
        const t = U.element_looped(this.array, index);
        return t;
    }
}

export function anim2sprite(dbid: GDB.DBID, anim: ResourceAnimator, rect: G.Rect): S.Sprite {
    return {
        dbid: dbid,
        comment: `anim-${dbid}`,
        ...rect,
        acc: G.v2d_mk_0(),
        vel: G.v2d_mk_0(),
	// no db available here to make starting alpha or z_ids.
	alpha: K.INVISIBLE_ALPHA,
	z_ids: undefined,
        step(db: GDB.GameDB) {
	    this.alpha = anim.alpha(db);
            this.z_ids = anim.z_ids(db);
        },
        get_lifecycle(db: GDB.GameDB) {
            return anim.is_alive(db) ? GDB.Lifecycle.alive : GDB.Lifecycle.dead
        },
        on_death(db: GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    };
}

export interface WarpinSpec {
    fighter_kind: string
    duration_msec: number;
    rect: G.Rect;
    resource_id: string;
    rank: S.Rank;
    on_end: GDB.Callback;
}

export function warpin_mk(db: GDB.GameDB, spec: WarpinSpec): S.Warpin {
    const images = db.uncloned.images;
    const resource_ids = [
	...images.lookup_range_a((n) => `warpin/warpin_${n}.png`, ['a','b','c','d']),
	...images.lookup_range_n((n) => `warpin/warpin${n}.png`, 1, 5)
    ];
    const alphas = Array.from(
	{length:resource_ids.length},
	(_,i) => U.clip01(0.2 + i/resource_ids.length)
    );
    D.assert_eqeq(resource_ids.length, alphas.length);
    const animE = new ResourceAnimatorEvents(
	animator_mk(
            db.shared.sim_now,
            {
		resource_ids,
		alphas,
		frame_msec: spec.duration_msec / resource_ids.length,
		starting_mode: MultiImageStartingMode.hide,
		ending_mode: MultiImageEndingMode.hold
            }
	),
	// todo: dunno if the on_end behaviour could work via on_death instead, but maybe not.
	{on_end: spec.on_end}
    );
    const dbid = GDB.id_mk();
    const rect = G.rect_scale_mid(spec.rect, 1.25);
    return {
	fighter_kind: spec.fighter_kind,
        dbid: dbid,
        comment: `warpin-${dbid}`,
	...rect,
        rank: spec.rank,
        acc: G.v2d_mk_0(),
        vel: G.v2d_mk_0(),
        alpha: animE.alpha(db),
	z_ids: animE.z_ids(db),
        step(db: GDB.GameDB) {
	    this.alpha = animE.alpha(db);
            const top = animE.z_ids(db) || K.MISSING_IMAGE_RESOURCE_ID;
            this.z_ids = [...top];
        },
        get_lifecycle(db: GDB.GameDB) {
            return animE.is_alive(db) ? GDB.Lifecycle.alive : GDB.Lifecycle.dead
        },
        on_death(db: GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    } as S.Warpin;
}

// todo: the naming from here on down sucks because
// i have too many variations on the themes
// and didn't come up with good clear names.

// note: the following don't use 'step()' whereas
// sprites do, so watch out for that impedance mis/match.

// todo: dead code alert. 't' below was originally to allow for different
// sprites depending on the level of damage 0...1, so sprites could
// degreade as they are hit.
// but (1) now we have the damage bar, and (2) there was not a good
// way to calculate 't' from the sprite (only from the shield). :-(
export type T2A = [number, ResourceAnimator];
export type AnimationDimensionsSpec_Thrusting2T01 = Map<boolean, Array<T2A>>;
export type AnimatorDimensionsSpec = Map<F.Facing, AnimationDimensionsSpec_Thrusting2T01>;

export interface DimensionsFrame {
    animator: ResourceAnimator;
    facing: F.Facing;
    thrusting: boolean;
    t: number; // health 1...0, unimplemented feature.
}

export function dimension_spec_mk(db: GDB.GameDB, frames: DimensionsFrame[]): AnimatorDimensionsSpec {
    const t2t_mk = () => {
        const t2t = new Map<boolean, Array<T2A>>();
        t2t.set(false, []);
        t2t.set(true, []);
        return t2t;
    };
    const spec = new Map<F.Facing, AnimationDimensionsSpec_Thrusting2T01>();
    spec.set(F.Facing.left, t2t_mk());
    spec.set(F.Facing.right, t2t_mk());
    frames.forEach(f => {
        const a = spec.get(f.facing)?.get(f.thrusting);
        D.assert(a != null);
        a!.push([f.t, f.animator]);
    });
    return spec;
}

export class AnimatorDimensions {

    private spec: AnimatorDimensionsSpec;

    constructor(spec: AnimatorDimensionsSpec) {
        this.spec = spec;
    }

    is_alive(db: GDB.GameDB): boolean {
        return Object.values(Object.values(Object.values(this.spec)))
            .reduce(
                (is: boolean, a: ResourceAnimator) => is && a.is_alive(db),
                true
            )
    }

    z_ids(db: GDB.GameDB, facing: F.Facing, thrusting: boolean, t01: number): U.O<string[]> {
        return U.if_let(
            this.spec.get(facing)?.get(thrusting),
            table => {
                let anim = table[0][1];
                table.forEach(e => {
                    if (e[0] > t01) {
                        anim = e[1];
                    }
                });
                return anim.z_ids(db);
            }
        );
    }
}

export interface ResourceAnimator {
    is_alive(db: GDB.GameDB): boolean;
    alpha(db: GDB.GameDB): number;
    z_ids(db: GDB.GameDB): U.O<string[]>;
}

export interface FacingResourceAnimator {
    is_alive(db: GDB.GameDB): boolean;
    alpha(db: GDB.GameDB): number;
    z_ids(db: GDB.GameDB, facing: F.Facing): U.O<string[]>;
}

export interface HasAnim {
    anim: ResourceAnimator;
}

export interface Range01Anim {
    get_anim_t(db: GDB.GameDB, t: number): ResourceAnimator;
}

export interface FacingRange01Anim {
    get_anim_t(db: GDB.GameDB, t: number): FacingResourceAnimator;
}

// as if i even know what these really mean any more.
export enum MultiImageStartingMode {
    hide,
    hold,
}

export enum MultiImageEndingMode {
    hide,
    hold,
    loop,
    bounce,
}

export type MultiImageSpec = {
    frame_msec: number;
    // resource_ids.length must === alpha.length
    // currently we only support fixed, not computed, alphas.
    resource_ids: Array<string>;
    alphas: Array<number>;
    starting_mode: MultiImageStartingMode;
    ending_mode: MultiImageEndingMode;
    // er, i assume to delay for warp anim?
    offset_msec?: number;
}
export type MultiImageSpec1Alphas = Omit<MultiImageSpec, 'alphas'>;
export function spec1Alphas(spec: MultiImageSpec1Alphas): MultiImageSpec {
    return {
	...spec,
	alphas: Array.from({length:spec.resource_ids.length}, () => 1)
    };
}
export interface SingleImageSpec {
    resource_id: string;
    // er, i assume to delay for warp anim?
    offset_msec?: number; 
}
// i really dislike that ts doesn't support nominal typing well.
export type ImagesSpec = MultiImageSpec1Alphas | MultiImageSpec | SingleImageSpec;

export function animator_mk(now: number, spec: ImagesSpec): ResourceAnimator {
    if ((spec as any).frame_msec == null) { // structural typing can be wugly.
        return new SingleImageAnimator(now, spec as SingleImageSpec);
    }
    else {
        return new MultiImageAnimator(now, spec1Alphas(spec as MultiImageSpec));
    }
}

export function facing_animator_mk(now: number, left_spec: ImagesSpec, right_spec: ImagesSpec): FacingResourceAnimator {
    return new FacingResourceAnimatorPrivate(now, left_spec, right_spec);
}
export function same_facing_animator_mk(now: number, spec: ImagesSpec): FacingResourceAnimator {
    return new FacingResourceAnimatorPrivate(now, spec, spec);
}

export class ResourceAnimatorEvents implements ResourceAnimator {
    private animator: ResourceAnimator;
    private on_start: U.O<GDB.Callback>;
    private on_end: U.O<GDB.Callback>;
    private started: boolean;
    private ended: boolean;

    constructor(animator: ResourceAnimator, options: {on_start?: GDB.Callback, on_end?: GDB.Callback}) {
        this.animator = animator;
        this.on_start = options.on_start;
        this.on_end = options.on_end;
        this.started = false;
        this.ended = false;
    }

    is_alive(db: GDB.GameDB): boolean {
        const now = db.shared.sim_now;
        const is_alive = this.animator.is_alive(db);
        // todo: this is implicitly assuming that 'now' will be
        // monotonically increasing, which sorta means we should
        // maybe move back toward having an explicit step() function
        // in these interfaces instead, to make it a little more concrete.
        if (is_alive && !this.started && this.z_ids(db) != undefined) {
            this.started = true;
            this.on_start && this.on_start(db);
        }
        if (!is_alive && !this.ended) {
            this.ended = true;
            this.on_end && this.on_end(db);
        }
        return is_alive;
    }

    alpha(db: GDB.GameDB): number {
	return this.animator.alpha(db);
    }
    
    z_ids(db: GDB.GameDB): U.O<string[]> {
        return this.animator.z_ids(db);
    }
}

// this is meant to be used in assert-should-not-ever-happen parts of the code (vs. TheVoidImageAnimator).
// the missing.png is a bight rectangle to try to make it obvious during testing.
// todo: figure out how to have a debug vs. release build so that
// missing vs. void animators are used, respectively.
export const TheMissingAnimator = new class implements ResourceAnimator {
    is_alive(db: GDB.GameDB) { return true; }
    z_ids(db: GDB.GameDB) { return [K.MISSING_IMAGE_RESOURCE_ID]; }
    alpha(db: GDB.GameDB) { return 1; }
}();

// this is meant to be used in we-know-it-could-be-blank parts of the code (vs. TheMissingImageAnimator).
export const TheVoidImageAnimator = new class implements ResourceAnimator {
    is_alive(db: GDB.GameDB) { return true; }
    alpha(db: GDB.GameDB) { return K.INVISIBLE_ALPHA; }
    z_ids(db: GDB.GameDB) { return undefined; }
}();

export class SingleImageAnimator implements ResourceAnimator {
    private start_msec: number;
    private spec: SingleImageSpec;

    constructor(now: number, spec: SingleImageSpec) {
        this.start_msec = now + (spec.offset_msec??0);
        this.spec = spec;
    }

    is_alive(db: GDB.GameDB): boolean {
        return true;
    }

    alpha(db: GDB.GameDB): number {
	return 1;
    }

    z_ids(db: GDB.GameDB): U.O<string[]> {
        const now = db.shared.sim_now;
        if (this.start_msec > now) {
            return undefined;
        }
        else {
            return [this.spec.resource_id];
        }
    }
}
    
export class MultiImageAnimator implements ResourceAnimator {
    private start_msec: number;
    private end_msec: number;
    private spec: MultiImageSpec;

    constructor(now: number, spec: MultiImageSpec) {
        this.start_msec = now + (spec.offset_msec??0);
        this.end_msec = this.start_msec + spec.frame_msec * spec.resource_ids.length;
        this.spec = spec;
    }

    get duration(): number {
        return this.end_msec - this.start_msec;
    }

    is_alive(db: GDB.GameDB): boolean {
        const now = db.shared.sim_now;
        const is = now < this.end_msec;
        return is;
    }

    alpha(db: GDB.GameDB): number {
        const now = db.shared.sim_now;
        let index;
        if (now < this.start_msec) {
	    index = MultiImageAnimatorIndexer.get_starting_index(db, this.spec);
        }
        else if (now >= this.end_msec) {
            index = MultiImageAnimatorIndexer.get_ending_index(db, this.spec, this.start_msec);
	    if (index === -1) { index =this.spec.alphas.length-1; }
        }
        else {
            index = MultiImageAnimatorIndexer.get_running_index(db, this.spec, this.start_msec);
        }
	return U.isU(index) ? K.INVISIBLE_ALPHA : this.spec.alphas[index];
    }

    z_ids(db: GDB.GameDB): U.O<string[]> {
        const now = db.shared.sim_now;
        let index;
        if (now < this.start_msec) {
	    index = MultiImageAnimatorIndexer.get_starting_index(db, this.spec);
        }
        else if (now >= this.end_msec) {
            index = MultiImageAnimatorIndexer.get_ending_index(db, this.spec, this.start_msec);
	    if (index === -1) { index =this.spec.resource_ids.length-1; }
        }
        else {
            index = MultiImageAnimatorIndexer.get_running_index(db, this.spec, this.start_msec);
        }
	const id = U.isU(index) ? undefined :this.spec.resource_ids[index];
        return id != null ? [id] : undefined;
    }
}

const MultiImageAnimatorIndexer = {
    get_starting_index(db: GDB.GameDB, spec: MultiImageSpec): U.O<number> {
        switch (spec.starting_mode) {
        case MultiImageStartingMode.hide:
	    return undefined;
        case MultiImageStartingMode.hold:
            return 0;
	default:
	    D.assert_fail(spec.starting_mode);
	    break;
        }
    },

    get_running_index(db: GDB.GameDB, spec: MultiImageSpec, start_msec: number): U.O<number> {
        const now = db.shared.sim_now;
        const elapsed = now - start_msec;
        return Math.floor(elapsed / spec.frame_msec);
    },

    get_ending_index(db: GDB.GameDB, spec: MultiImageSpec, start_msec: number): U.O<number> {
        switch (spec.ending_mode) {
        case MultiImageEndingMode.hide:
            return undefined;
        case MultiImageEndingMode.hold:
            return -1; // like python arr[-1]
        case MultiImageEndingMode.loop: {
            const now = db.shared.sim_now;
            const elapsed = now - start_msec;
            return Math.floor(elapsed / spec.frame_msec) % spec.resource_ids.length;
        }
        case MultiImageEndingMode.bounce: {
            const now = db.shared.sim_now;
            const elapsed = now - start_msec;
	    const length = spec.resource_ids.length;
            const long_index = Math.floor(elapsed / spec.frame_msec) % (length * 2);
	    return long_index < length ? long_index : length-(long_index-length)-1;
        }
        }
    },
};

class FacingResourceAnimatorPrivate implements FacingResourceAnimator {
    left: ResourceAnimator;
    right: ResourceAnimator;

    constructor(now: number, left_spec: ImagesSpec, right_spec: ImagesSpec) {
        this.left = animator_mk(now, left_spec);
        this.right = animator_mk(now, right_spec);
    }

    get_animator(facing: F.Facing): ResourceAnimator {
        return F.on_facing(facing, this.left, this.right);
    }

    is_alive(db: GDB.GameDB): boolean {
        return this.left.is_alive(db) && this.right.is_alive(db);
    }

    alpha(db: GDB.GameDB): number {
	return 1;
    }

    z_ids(db: GDB.GameDB, facing: F.Facing): U.O<string[]> {
        return this.get_animator(facing).z_ids(db);
    }
}

export function anim_sprite_mk(db: GDB.GameDB, rect: G.Rect, anim: ResourceAnimator): GDB.PreDbId<S.Sprite> {
    return {
        ...rect,
        comment: 'anim-sprite',
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        alpha: anim.alpha(db),
        z_ids: anim.z_ids(db),
        step(db: GDB.GameDB) {
	    this.alpha = anim.alpha(db);
            this.z_ids = anim.z_ids(db);
        },
        get_lifecycle(db: GDB.GameDB) {
            return anim.is_alive(db) ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
        },
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this as unknown as S.Sprite);
        }
    };
}

export class DrawingAnimation {
    private start_msec: number;
    drawing: Dr.Drawing;

    constructor(
	db: GDB.GameDB,
	private rect: G.Rect,
	private duration_msec: number,
	private draw: (db: GDB.GameDB, rect: G.Rect, drawing: Dr.Drawing, t: number) => void
    ) {
        this.start_msec = db.shared.sim_now;
        this.drawing = Dr.drawing_mk();
    }

    step(db: GDB.GameDB) {
        this.drawing = Dr.drawing_mk();
        const now = db.shared.sim_now;
        const t = (now - this.start_msec) / this.duration_msec;
	this.draw(db, this.rect, this.drawing, t);
    }

    is_alive(db: GDB.GameDB): boolean {
        const now = db.shared.sim_now;
        const is = now < this.start_msec + this.duration_msec;
        return is;
    }
}
