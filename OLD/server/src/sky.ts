import * as GDB from './game_db';
import * as G from './geom';
import * as U from './util/util';
import * as S from './sprite';
import * as Ph from './phys';
import * as Rnd from './random';
import * as K from './konfig';

export function sky_mk(db: GDB.GameDB) {
    clouds_mk(db);
}

function clouds_mk(db: GDB.GameDB) {
    const ridx = (r: string): string => `clouds/${r}`;
    const ranges = [
        // from highest altitude to lowest.
        // todo: uh, this is kinda super hacky duh, like how it forces the non-cloud area.
        { count: 10, resource_ids: ["c_small.png"].map(ridx) },
        { count: 15, resource_ids: ["c_middle.png", "c_small.png"].map(ridx) },
        { count: 5, resource_ids: ["c_small.png"].map(ridx) },
        { count: 0, resource_ids: [] },
        { count: 0, resource_ids: [] },
        { count: 0, resource_ids: [] },
        { count: 0, resource_ids: [] },
    ];
    const ground_y = db.shared.world.ground_y;
    const y_min = 0;
    const y_max = ground_y;
    const y_range = (y_max - y_min) / ranges.length;
    ranges.forEach((r, i) => {
        const range_y_min = y_min + y_range * i
        const range_y_max = range_y_min + y_range;
        sky_mk_range(db, r.count, range_y_min, range_y_max, r.resource_ids);
    });
}

function sky_mk_range(db: GDB.GameDB, count: number, y_min: number, y_max: number, resource_ids: string[]) {
    const images = db.uncloned.images;
    const range_rect = G.rect_mk(
        G.v2d_mk(0, y_min),
        G.v2d_mk(db.shared.world.bounds0.x-K.CLOUD_SIZE.x, y_max-y_min)
    );
    const cvc = G.v2d_mk(0.01, 0);
    const cvr = G.v2d_mk(0.01, 0);
    for (let i = 0; i < count; ++i) {
        const lt = Rnd.singleton.next_v2d_inside_rect(range_rect);
        U.if_let(
            Rnd.singleton.next_array_item(resource_ids),
            resource_id => {
                GDB.add_sprite_dict_id_mut(
                    db.shared.items.sky,
                    (dbid: GDB.DBID): S.Sprite => {
                        const s = {
                            dbid: dbid,
                            comment: `sky-${i}`,
                            vel: Rnd.singleton.next_v2d_around(cvc, cvr),
                            acc: G.v2d_mk_0(),
                            lt: lt,
                            size: G.v2d_scale(K.CLOUD_SIZE, Rnd.singleton.next_float_around(1.5, 0.5)),
                            alpha: K.CLOUD_ALPHA,
                            resource_id: images.lookup(resource_id),
                            get_lifecycle(_:GDB.GameDB) { return GDB.Lifecycle.alive },
                            on_death(_:GDB.GameDB) {},
                            step(db: GDB.GameDB) {
                                Ph.p2d_step_mut(this, db.local.frame_dt);
                                this.lt = G.v2d_wrapH(this.lt, db.shared.world.bounds0);
                            },
                            toJSON() {
                                return S.spriteJSON(this);
                            }
                        };
                        return s as S.Sprite;
                    }
                );
            }
        );
    }
}