import * as S from './sprite';
import * as GDB from './game_db';
import * as Rnd from './random';
import * as K from './konfig';
import * as D from './debug';
import * as U from './util/util';

export type ExplosionImgSpec = Omit<U.FieldsOnly<S.Explosion>, "resource_id"|"drawing">;
type FramesMk = (images: GDB.ImageResources) => string[];

// keep animations outside of explosion instance so we don't json the animation instances.
// allows for only one explosion A animation per dbid.
const animations: {[k:string]: ExplosionAnimation} = {};

interface ExplosionImgPrivate extends S.Explosion {
    get_anim(): U.O<ExplosionAnimation>;
}

const frames_mkA = (images: GDB.ImageResources): string[] => {
    const dir = "explosionA";
    const base = "tile";
    const start_n = 0;
    const end_n = 11;
    const frames = [];
    for(let n = start_n; n <= end_n; ++n) {
        const tail = String(n).padStart(3, '0') + ".png"
        const file = dir + "/" + base + tail; // todo: use a file path api?
        frames.push(images.lookup(file));
    }
    return frames;
}

const frames_mkB = (images: GDB.ImageResources): string[] => {
    const dir = "explosionB";
    const base = "exB";
    const start_n = 1;
    const end_n = 6;
    const frames = [];
    for(let n = start_n; n <= end_n; ++n) {
        const tail = `${n}.png`;
        const file = dir + "/" + base + tail; // todo: use a file path api?
        frames.push(images.lookup(file));
    }
    return frames;
}

export function explosionImg_mk(db: GDB.GameDB, spec: ExplosionImgSpec): S.Explosion {
    const frames_mk = Rnd.singleton.boolean() ? frames_mkA : frames_mkB;
    animations[spec.dbid] = new ExplosionAnimation(
        db,
        Rnd.singleton.float_around(K.EXPLOSIONA_MSEC, K.EXPLOSIONA_MSEC/10),
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
        const now = db.shared.sim_now;
        const is = now < this.start_msec + this.duration_msec;
        D.assert((is && !!this.frame) || (!is && !this.frame), "is-frame mismatch")
        return is;
    }
}
