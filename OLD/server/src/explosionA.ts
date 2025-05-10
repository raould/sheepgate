import * as S from './sprite';
import * as GDB from './game_db';
import * as Rnd from './random';
import * as K from './konfig';
import * as D from './debug';
import * as U from './util/util';

export type ExplosionASpec = Omit<U.FieldsOnly<S.Explosion>, "resource_id"|"drawing">;

// keep animations outside of explosion instance so we don't json the animation instances.
// allows for only one explosion A animation per dbid.
const animations: {[k:string]: ExplosionAnimation} = {};

interface ExplosionAPrivate extends S.Explosion {
    get_anim(): U.O<ExplosionAnimation>;
}

export function explosionA_mk(db: GDB.GameDB, spec: ExplosionASpec): S.Explosion {
    animations[spec.dbid] = new ExplosionAnimation(
        db,
        Rnd.singleton.float_around(K.EXPLOSIONA_MSEC, K.EXPLOSIONA_MSEC/10)
    );
    const e: ExplosionAPrivate = {
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
            return is ? GDB.Lifecycle.alive : GDB.Lifecycle.reap;
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
    private duration_msec: number;
    private start_msec: number;
    private frames: string[];
    private frame: U.O<string>;
    private alpha: number;

    constructor(db: GDB.GameDB, duration_msec: number) {
        this.duration_msec = duration_msec;
        this.start_msec = db.shared.sim_now;
        this.frames = this.loadExplosionA(db.uncloned.images, "explosionA");
        this.frame = this.frames[0]; // yes, runtime error if there's no images found! hah!
        this.alpha = 1;
    }

    // todo: omfg what a hard coded nightmare.
    // match: todo: share this code with the client.
    private loadExplosionA(images: GDB.ImageResources, dir: string): string[] {
        const frames = [];
        const start_n = 0;
        const end_n = 11;
        const base = "tile";
        for(let n = start_n; n <= end_n; ++n) {
            const tail = String(n).padStart(3, '0') + ".png"
            const file = dir + "/" + base + tail; // todo: use a file path api?
            frames.push(images.lookup(file));
        }
        return frames;
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
