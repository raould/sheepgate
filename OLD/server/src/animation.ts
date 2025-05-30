/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as S from './sprite';
import * as G from './geom';
import * as F from './facing';
import * as U from './util/util';
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
        alpha: 1,
        step(db: GDB.GameDB) {
            this.z_back_to_front_ids = anim.z_back_to_front_ids(db);
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
    const anim = animator_mk(
        db.shared.sim_now,
        {
            frame_msec: spec.duration_msec / resource_ids.length,
            resource_ids: resource_ids,
            starting_mode: MultiImageStartingMode.hide,
            ending_mode: MultiImageEndingMode.hold        
        }
    );

    // todo: dunno if the on_end behaviour could work via on_death instead, but maybe not.
    const events = new ResourceAnimatorEvents(anim, {on_end: spec.on_end});

    const dbid = GDB.id_mk();
    return {
        dbid: dbid,
        comment: `warpin-${dbid}`,
        // todo: i REALLY wish the warpin was like 1.25 or 1.5x bigger
        // than the final sprite but that's not supported atm
        // (it would probably have to be 2 z-ordrered sprites).
        ...spec.rect,
        rank: spec.rank,
        acc: G.v2d_mk_0(),
        vel: G.v2d_mk_0(),
        alpha: 1,
        step(db: GDB.GameDB) {
            const top = events.z_back_to_front_ids(db) || K.MISSING_IMAGE_RESOURCE_ID;
            this.z_back_to_front_ids = [spec.resource_id, ...top];
        },
        get_lifecycle(db: GDB.GameDB) {
            return events.is_alive(db) ? GDB.Lifecycle.alive : GDB.Lifecycle.dead
        },
        on_death(db: GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    };
}

// todo: the naming from here on down sucks because
// i have too many variations on the themes
// and didn't come up with good clear names.

// note: the following don't use 'step()' whereas
// sprites do, so watch out for that impedance mis/match.

// todo: maybe pull out code for A.DrawingAnimator from the explosion code.

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

    z_back_to_front_ids(db: GDB.GameDB, facing: F.Facing, thrusting: boolean, t01: number): U.O<string[]> {
        return U.if_let(
            this.spec.get(facing)?.get(thrusting),
            table => {
                let anim = table[0][1];
                table.forEach(e => {
                    if (e[0] > t01) {
                        anim = e[1];
                    }
                });
                return anim.z_back_to_front_ids(db);
            }
        );
    }
}

export interface ResourceAnimator {
    is_alive(db: GDB.GameDB): boolean;
    z_back_to_front_ids(db: GDB.GameDB): U.O<string[]>;
    // todo: alpha?
}

export interface FacingResourceAnimator {
    is_alive(db: GDB.GameDB): boolean;
    z_back_to_front_ids(db: GDB.GameDB, facing: F.Facing): U.O<string[]>;
    // todo: alpha?
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

export interface MultiImageSpec {
    frame_msec: number;
    resource_ids: Array<string>;
    starting_mode: MultiImageStartingMode;
    ending_mode: MultiImageEndingMode;
    // er, i assume to delay for warp anim?
    offset_msec?: number;
}
export interface SingleImageSpec {
    resource_id: string;
    // er, i assume to delay for warp anim?
    offset_msec?: number; 
}
// i really dislike that ts doesn't support nominal typing well.
export type ImagesSpec = MultiImageSpec | SingleImageSpec;

export function animator_mk(now: number, spec: ImagesSpec): ResourceAnimator {
    if ((spec as any).frame_msec == null) { // structural typing can be wugly.
        return new SingleImageAnimator(now, spec as SingleImageSpec);
    }
    else {
        return new MultiImageAnimator(now, spec as MultiImageSpec);
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
        if (is_alive && !this.started && this.z_back_to_front_ids(db) != undefined) {
            this.started = true;
            this.on_start && this.on_start(db);
        }
        if (!is_alive && !this.ended) {
            this.ended = true;
            this.on_end && this.on_end(db);
        }
        return is_alive;
    }

    z_back_to_front_ids(db: GDB.GameDB): U.O<string[]> {
        return this.animator.z_back_to_front_ids(db);
    }
}

// this is meant to be used in should-not-ever-happen parts of the code vs. TheVoidImageAnimator.
export const TheMissingAnimator = new class implements ResourceAnimator {
    is_alive(db: GDB.GameDB) { return true; }
    // the missing.png is a bight rectangle to try to make it obvious during testing.
    // todo: figure out how to have a debug vs. release build so that
    // missing vs. void animators are used, respectively.
    z_back_to_front_ids(db: GDB.GameDB) { return [K.MISSING_IMAGE_RESOURCE_ID]; }
}();

// this is meant to be used in we-know-it-could-be-blank parts of the code vs. TheMissingImageAnimator.
export const TheVoidImageAnimator = new class implements ResourceAnimator {
    is_alive(db: GDB.GameDB) { return true; }
    z_back_to_front_ids(db: GDB.GameDB) { return undefined; }
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

    z_back_to_front_ids(db: GDB.GameDB): U.O<string[]> {
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

    z_back_to_front_ids(db: GDB.GameDB): U.O<string[]> {
        const now = db.shared.sim_now;
        let id;
        if (now < this.start_msec) {
            id = this.get_starting_resource_id(db);
        }
        else if (now >= this.end_msec) {
            id = this.get_ending_resource_id(db);
        }
        else {
            id = this.get_running_resource_id(db);
        }
        return id != null ? [id] : undefined;
    }
     
    private get_starting_resource_id(db: GDB.GameDB): U.O<string> {
        switch (this.spec.starting_mode) {
            case MultiImageStartingMode.hide:
                return undefined;
            case MultiImageStartingMode.hold:
                return this.spec.resource_ids[0];
        }
    }

    private get_running_resource_id(db: GDB.GameDB): U.O<string> {
        const now = db.shared.sim_now;
        const elapsed = now - this.start_msec;
        const index = Math.floor(elapsed / this.spec.frame_msec);
        return this.spec.resource_ids[index];
    }

    private get_ending_resource_id(db: GDB.GameDB): U.O<string> {
        switch (this.spec.ending_mode) {
            case MultiImageEndingMode.hide:
                return undefined;
            case MultiImageEndingMode.hold:
                return this.spec.resource_ids[this.spec.resource_ids.length-1];
            case MultiImageEndingMode.loop: {
                const now = db.shared.sim_now;
                const elapsed = now - this.start_msec;
                const index = Math.floor(elapsed / this.spec.frame_msec) % this.spec.resource_ids.length;
                return this.spec.resource_ids[index];
            }
            case MultiImageEndingMode.bounce: {
                const now = db.shared.sim_now;
                const elapsed = now - this.start_msec;
		const length = this.spec.resource_ids.length;
                const long_index = Math.floor(elapsed / this.spec.frame_msec) % (length * 2);
		const index = long_index < length ? long_index : length-(long_index-length)-1;
                return this.spec.resource_ids[index];
            }
        }
    }
}

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

    z_back_to_front_ids(db: GDB.GameDB, facing: F.Facing): U.O<string[]> {
        return this.get_animator(facing).z_back_to_front_ids(db);
    }
}

export function anim_sprite_mk(db: GDB.GameDB, anim: ResourceAnimator, rect: G.Rect): GDB.PreDbId<S.Sprite> {
    return {
        ...rect,
        comment: 'anim',
        vel: G.v2d_mk_0(),
        acc: G.v2d_mk_0(),
        alpha: 1,
        z_back_to_front_ids: anim.z_back_to_front_ids(db),
        step(db: GDB.GameDB) {
            this.z_back_to_front_ids = anim.z_back_to_front_ids(db);
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
