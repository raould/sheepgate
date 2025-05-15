import * as S from './sprite';
import * as G from './geom';
import * as GDB from './game_db';
import * as Dr from './drawing';
import { RGBA } from './color';
import * as K from './konfig';
import * as U from './util/util';

// todo: some less horrible way to do all the specs, ugh.
export type ExplosionBSpec = Omit<U.FieldsOnly<S.Explosion>, "resource_id" | "drawing">;

// keep animations outside of explosion instance so we don't json the animation instances.
// allows for only one explosion B animation per dbid.
const animations: { [k: string/*DbId*/]: ExplosionAnimation } = {};

interface ExplosionBPrivate extends S.Explosion {
    anim: U.O<ExplosionAnimation>;
}

export function explosionX_mk(db: GDB.GameDB, spec: ExplosionBSpec): S.Explosion {
    animations[spec.dbid] = new ExplosionAnimation(db, spec, K.EXPLOSIONB_MSEC);
    const e: ExplosionBPrivate = {
        ...spec,
        get anim(): U.O<ExplosionAnimation> {
            return animations[this.dbid];
        },
        step(db: GDB.GameDB) {
            this.drawing = undefined;
            U.if_let(
                this.anim,
                (anim: ExplosionAnimation) => {
                    anim.step(db);
                    if (!anim.is_alive(db)) {
                        delete animations[this.dbid];
                    }
                    else {
                        this.drawing = anim.drawing;
                    }
                }
            );
        },
        get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
            const is = U.if_let(
                this.anim,
                (anim: ExplosionAnimation) => anim.is_alive(db)
            ) || false;
            return is ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
        },
        on_death(_:GDB.GameDB) {},
        toJSON() {
            return S.spriteJSON(this);
        }
    };
    return e as S.Explosion;
}

// todo: maybe pull out code for A.DrawingAnimator.
// does not have a location, only the drawings.
class ExplosionAnimation {
    private rect: G.Rect;
    private duration_msec: number;
    private start_msec: number;
    drawing: Dr.Drawing;

    constructor(db: GDB.GameDB, rect: G.Rect, duration_msec: number) {
        this.rect = rect;
        this.duration_msec = duration_msec;
        this.start_msec = db.shared.sim_now;
        this.drawing = Dr.drawing_mk();
    }

    step(db: GDB.GameDB) {
        this.drawing = Dr.drawing_mk();
        const now = db.shared.sim_now;
        const t = (now - this.start_msec) / this.duration_msec;
        if (t >= 0 && t <= 1) {
            const a = 1 - t;
            const w = 5 - t * 5;
            this.drawing.ellipses.push({
                bounds: G.rect_scale_mid_v2d(
                    this.rect,
                    G.v2d_mk_nn(3 * t)
                ),
                line_width: w,
                color: RGBA.new01(1, 0.4, 0, a),
                is_filled: false,
                wrap: true,
            });
            this.drawing.ellipses.push({
                bounds: G.rect_scale_mid_v2d(
                    this.rect,
                    G.v2d_mk_nn(0.5 + t)
                ),
                line_width: w * 2,
                color: RGBA.new01(1, 0.4, 0.4, a),
                is_filled: true,
                wrap: true,
            });
        }
    }

    is_alive(db: GDB.GameDB): boolean {
        const now = db.shared.sim_now;
        const is = now < this.start_msec + this.duration_msec;
        return is;
    }
}
