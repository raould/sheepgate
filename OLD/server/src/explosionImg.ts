/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as S from './sprite';
import * as GDB from './game_db';
import * as Rnd from './random';
import * as K from './konfig';
import * as D from './debug';
import * as U from './util/util';

export type ExplosionImgSpec = Omit<U.FieldsOnly<S.Explosion>, "resource_id"|"drawing"> & {
    explosion_kind: S.ExplosionKind;
};
type FramesMk = (images: GDB.ImageResources) => string[];

// keep animations outside of explosion instance so we don't json the animation instances.
// (uh todo: doesn't that mean we have to not do that for other sprites too, then?)
// only allows for one explosion A animation per dbid.
const animations: {[k:string]: ExplosionAnimation} = {};

interface ExplosionImgPrivate extends S.Explosion {
    get_anim(): U.O<ExplosionAnimation>;
}

function frames_mk_helper(images: GDB.ImageResources, dir: string, base: string, start: number, end: number, pad?: number): string[] {
    const count = end - start + 1;
    return [...Array(count).keys()]
	.map(i => {
	    const n = i + start;
	    const padded = pad == null ? String(n) : String(n).padStart(pad, '0');
	    return images.lookup(`${dir}/${base}${padded}.png`);
	});
}

function frames_mkA(images: GDB.ImageResources): string[] {
    return frames_mk_helper(images, "explosionA", "tile", 0, 11, 3);
}

function frames_mkB(images: GDB.ImageResources): string[] {
    return frames_mk_helper(images, "explosionB", "exB", 1, 6);
}

function frames_mkCbm(images: GDB.ImageResources): string[] {
    return frames_mk_helper(images, "explosionCbm", "cboom", 0, 6);
}

function frames_mkZx(images: GDB.ImageResources): string[] {
    // todo
    // return frames_mk_helper(images, "explosionZx", "zxboom", 0, 6);
    return frames_mk_helper(images, "explosionCbm", "cboom", 0, 6);
}

function frames_mk_mk(explosion_kind: S.ExplosionKind): FramesMk {
    switch(explosion_kind) {
    case S.ExplosionKind.regular: {
	return Rnd.singleton.boolean() ? frames_mkA : frames_mkB;
    }
    case S.ExplosionKind.cbm: {
	return frames_mkCbm;
    }
    case S.ExplosionKind.zx: {
	return frames_mkZx;
    }
    }
}

export function explosionImg_mk(db: GDB.GameDB, spec: ExplosionImgSpec): S.Explosion {
    const frames_mk = frames_mk_mk(spec.explosion_kind);
    animations[spec.dbid] = new ExplosionAnimation(
        db,
        Rnd.singleton.float_around(K.EXPLOSION_MSEC, K.EXPLOSION_MSEC/10),
	frames_mk
    );
    const e: ExplosionImgPrivate = {
        ...spec,
        get_anim(): U.O<ExplosionAnimation> {
            return animations[this.dbid];
        },
        step(db: GDB.GameDB) {
            this.resource_id = undefined;
            U.if_let(
                this.get_anim(),
                anim => {
                    anim.step(db);
                    if (anim.is_alive(db)) {
                        this.resource_id = anim.get_resource();
                        this.alpha = anim.get_alpha();
                    }
                }
            );
        },
        get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
            const is = U.if_let_safe(
                this.get_anim(),
                anim => anim.is_alive(db),
                () => false
            );
            return is ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
        },
        on_death(_:GDB.GameDB) {
            delete animations[this.dbid];
        },
        toJSON() {
            return S.spriteJSON(this);
        }
    }
    return e as S.Explosion;
}

// todo: maybe pull out code for A.DrawingAnimator.
// does not have a location, only the image resources.
class ExplosionAnimation {
    private start_msec: number;
    private frames: string[];
    private frame: U.O<string>;
    private alpha: number;

    constructor(db: GDB.GameDB, private readonly duration_msec: number, frames_mk: FramesMk) {
        this.start_msec = db.shared.sim_now;
        this.frames = frames_mk(db.uncloned.images);
        this.frame = this.frames[0]; // yes, runtime error if there's no images found! hah!
        this.alpha = 1;
    }

    get_resource(): U.O<string> {
        return this.frame;
    }

    get_alpha(): number {
        return this.alpha;
    }

    step(db: GDB.GameDB) {
        const now = db.shared.sim_now;
        const t = (now - this.start_msec) / this.duration_msec;
        this.alpha = 1 - U.clip01(t);
        if (t >= 0 && t <= 1) {
            const index = Math.floor(t * this.frames.length);
            this.frame = this.frames[index];
        }
        else {
            this.frame = undefined;
        }
    }

    is_alive(db: GDB.GameDB): boolean {
	return U.exists(this.frame);
    }
}
