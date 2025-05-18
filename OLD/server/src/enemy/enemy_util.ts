import * as G from '../geom';
import * as GDB from '../game_db';
import * as S from '../sprite';
import * as U from '../util/util';
import * as Rnd from '../random';
import * as K from '../konfig';
import * as D from '../debug';
import * as F from '../facing';

export function level_scale_down(level: number, max: number, min: number): number {
    D.assert(min <= max);
    const t = U.t10(1, 10, level);
    return min + (max-min) * t;
}
export function level_scale_up(level: number, min: number, max: number): number {
    D.assert(min <= max);
    const t = U.t01(1, 10, level);
    return min + (max-min) * t;
}

export function can_shoot_in_bounds(db: GDB.GameDB, enemy: S.Enemy): boolean {
    return !G.rect_is_out_of_bounds(
        enemy,
        db.shared.world.gameport.enemy_firing_bounds
    );
}

// todo: this doesn't actaually work right: things do sometimes still overlap or are too close, wtf!!!!!!!!!!!!!!!
export function safe_lt(db: GDB.GameDB, rank: S.Rank, size: G.V2D, rnd: Rnd.Random, lt: G.V2D | undefined): G.V2D {
    const slt = safe_lt_vs_enemy(db, size, rnd, lt);
    safe_lt_vs_player(db, rank, size, rnd, slt);
    return slt;
}

export function safe_lt_vs_player(db: GDB.GameDB, rank: S.Rank, size: G.V2D, rnd: Rnd.Random, lt: G.V2D) {
    const p = GDB.get_player(db);
    if (!!p) {
	if (rank >= S.Rank.hypermega) {
	    lt = G.v2d_mk(
		p.lt.x + db.shared.world.bounds0.x/2,
		lt.y,
	    )
	}
	else {
            const rect = G.rect_mk(lt, size);
	    const padded_scale = G.v2d_scale(K.SHIELD_SCALE, 1.2);
            const padded = G.rect_scale_mid_v2d(p, padded_scale);
	    const hit = G.rects_are_overlapping_wrapH(rect, p, db.shared.world.bounds0);
            if (hit) {
		// move horizontally to avoid the hit.
		lt.x = p.lt.x + size.x * (5 * F.f2x(p.facing));
	    }
	}
    }
}

// avoid overlapping with existing enemies.
export function safe_lt_vs_enemy(db: GDB.GameDB, size: G.V2D, rnd: Rnd.Random, lt: G.V2D | undefined): G.V2D {
    let slt = lt ?? G.v2d_random_inxy(rnd, db.shared.world.bounds0.x, size.y);
    let padded_scale = G.v2d_scale(K.SHIELD_SCALE, 1.2);
    let hit: U.O<G.Rect>;
    let loop_max = 10;
    do {
        let r = G.rect_mk(slt, size);
        hit = Object.values(db.shared.items.enemies).find(e => {
            let padded = G.rect_scale_mid_v2d(e, padded_scale);
            let are = G.rects_are_overlapping_wrapH(r, padded, db.shared.world.bounds0);
            return are ? padded : undefined;
        });
        if (hit != null) {
            // move horizontally to avoid the hit.
            slt = G.v2d_add(slt, G.v2d_x0(hit.size));
        }
        --loop_max;
    } while (hit != null && loop_max > 0);
    return slt;
}
