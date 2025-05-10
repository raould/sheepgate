import * as U from './util/util';
import * as Rnd from './random';
import * as D from './debug';

let next_id = 0;

export interface Cooldown {
    duration_msec: number; // must be >= 1.
    last_msec: number;
    next_msec: number;
    // sorta strange in that if it returns true, it has updated
    // the clip and expects you to really make a shot.
    maybe_fire(now: number): boolean;
    catchup(now: number): void;
    id: number;
}

// todo: trying to DRY but this ends up being so fugly and evil. better to split the interface into public vs. private vs. spec!
type CooldownSpecBasic = Omit<Omit<Omit<U.FieldsOnly<Cooldown>, "last_msec">, "next_msec">, "id">;
type CooldownSpecMoar = { debug?: boolean; };
export type CooldownSpec = CooldownSpecBasic & CooldownSpecMoar;

export function cooldown_mk(spec: CooldownSpec): Cooldown {
    const id = next_id++;
    D.log("cooldown_mk", id, spec);
    const c: Cooldown = ({
        ...spec,
	id,
        last_msec: 0,
        next_msec: spec.duration_msec,
        maybe_fire(now: number): boolean {
            const usable = now > this.next_msec;
            if (usable) {
                this.last_msec = now;
                this.next_msec = now + Rnd.singleton.float_around(this.duration_msec, this.duration_msec*0.2);
		spec.debug && D.log("Cooldown.maybe_fire():", this.id, usable, U.F2D(this.last_msec), U.F2D(this.next_msec), U.F2D(this.next_msec-this.last_msec), ">?", U.F2D(this.duration_msec));
            }
            return usable;
        },
        catchup(now: number) {
            this.last_msec = now;
            this.next_msec = now + this.duration_msec;
        }
    });
    return c;
}

export interface ClipReloadFn {
    on_reload(): void;
}
export interface Clip {
    reload_spec: CooldownSpec & ClipReloadFn;
    shot_spec: CooldownSpec;
    count: number; // must be >= 1.
    maybe_fire(now: number): boolean;
    debug?: boolean;
}

export type ClipSpec = U.FieldsOnly<Clip>;

interface ClipPrivate extends Clip {
    reload_cooldown: Cooldown;
    shot_cooldown: Cooldown;
    // switches between reload & shot, just to be confusing.
    cooldown: Cooldown;
    reload(now: number): void;
    test(now: number): boolean;
    id: number;
}

export function clip_mk(spec: ClipSpec): Clip {
    const id = next_id++;
    D.log("clip_mk", id, spec);
    const s = cooldown_mk({ ...spec.shot_spec, debug: spec.debug });
    const c: ClipPrivate = ({
        ...spec,
	id,
        reload_cooldown: cooldown_mk({ ...spec.reload_spec, debug: spec.debug }),
        shot_cooldown: s,
        cooldown: s,
        maybe_fire(now: number): boolean {
            const test = this.test(now);
            if (test) {
                this.count--;
		spec.debug && D.log("Clip.maybe_fire():", this.id, this.count);
                if (this.count == 0) {
                    this.cooldown = this.reload_cooldown;
                    this.cooldown.catchup(now);
                }
            }
            return test;
        },
        test(now: number): boolean {
            const test = this.cooldown.maybe_fire(now);
            if (test && this.count == 0) {
                this.reload(now);
            }
            return test;
        },
        reload(now: number) {
	    spec.debug && D.log("Clip.reload():", this.id, U.F2D(now));
            this.count = spec.count;
            this.cooldown = this.shot_cooldown;
            this.cooldown.catchup(now);
            spec.reload_spec.on_reload();
        },
    });
    return c as Clip;
}
