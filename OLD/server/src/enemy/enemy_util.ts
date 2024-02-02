import * as G from '../geom';
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as U from '../util/util';
import * as Rnd from '../random';
import * as K from '../konfig';

export function can_shoot_in_bounds(db: GDB.GameDB, enemy: S.Enemy): boolean {
    return !G.rect_is_out_of_bounds(
        enemy,
        db.shared.world.gameport.enemy_firing_bounds
    );
}

export function safe_lt(db: GDB.GameDB, size: G.V2D, rnd: Rnd.Random): G.V2D {
    // todo: this doesn't actaually work right: things do sometimes still overlap, wtf.
    let lt = G.v2d_random_inxy(rnd, db.shared.world.bounds0.x, size.y);
    let buffered_scale = G.v2d_scale(K.SHIELD_SCALE, 1.2);
    let hit: U.O<G.Rect>;
    let loop_max = 10;
    do {
        let r = G.rect_mk(lt, size);
        hit = Object.values(db.shared.items.enemies).find(e => {
            let buffered = G.rect_scale_mid_v2d(e, buffered_scale);
            let are = G.rects_are_overlapping_wrapH(r, buffered, db.shared.world.bounds0);
            return are ? buffered : undefined;
        });
        if (hit != null) {
            // move horizontally to avoid the hit.
            lt = G.v2d_add(lt, G.v2d_x0(hit.size));
        }
        --loop_max;
    } while (hit != null && loop_max > 0);
    return lt;
}
