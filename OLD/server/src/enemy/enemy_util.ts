/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from '../geom';
import * as Gr from '../geom_rnd';
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

export function safe_lt(db: GDB.GameDB, rank: S.Rank, size: G.V2D, rnd: Rnd.Random, lt: G.V2D | undefined): G.V2D {
    const sltve = safe_lt_vs_enemy(db, size, rnd, lt);
    const sltvp = safe_lt_vs_player(db, rank, size, rnd, sltve);
    const sltw = G.v2d_wrapH(sltvp, db.shared.world.bounds0); // todo: no idea any more where/when i do/not have to wrap.
    return sltw;
}

export function safe_lt_vs_player(db: GDB.GameDB, rank: S.Rank, size: G.V2D, rnd: Rnd.Random, lt: G.V2D): G.V2D {
    let slt = lt;
    U.if_let(
	GDB.get_player(db),
	player => {
	    if (rank >= S.Rank.hypermega) {
		slt = G.v2d_wrapH(
		    G.v2d_mk(
			player.lt.x + db.shared.world.bounds0.x/3,
			lt.y,
		    ),
		    db.shared.world.bounds0
		);
	    }
	    else {
		const rect = G.rect_mk(lt, size);
		const padded_scale = G.v2d_scale(K.SHIELD_SCALE, 1.2);
		const padded = G.rect_scale_mid_v2d(player, padded_scale);
		const hit = G.rects_are_overlapping_wrapH(rect, player, db.shared.world.bounds0);
		if (hit) {
		    slt = G.v2d_set_x(
			slt,
			player.lt.x + size.x * (5 * F.f2x(player.facing))
		    );
		}
	    }
	}
    );
    return slt;
}

// avoid overlapping with existing enemies.
export function safe_lt_vs_enemy(db: GDB.GameDB, size: G.V2D, rnd: Rnd.Random, lt: G.V2D | undefined): G.V2D {
    let slt = lt ?? Gr.v2d_random_inxy(rnd, db.shared.world.bounds0.x, size.y);
    let padded_scale = G.v2d_scale(K.SHIELD_SCALE, 1.2);
    let hit_e: U.O<G.Rect>;
    let hit_m: U.O<G.Rect>;
    let loop_max = 10;

    do {
        let r = G.rect_mk(slt, size);
        hit_e = Object.values(db.shared.items.enemies).find(e => {
            let padded = G.rect_scale_mid_v2d(e, padded_scale);
            let are = G.rects_are_overlapping_wrapH(r, padded, db.shared.world.bounds0);
            return are ? padded : undefined;
        });
        if (hit_e != undefined) {
            slt = G.v2d_add(slt, G.v2d_x0(hit_e.size));
        }

        hit_m = Object.values(db.shared.items.munchies).find(e => {
            let padded = G.rect_scale_mid_v2d(e, padded_scale);
            let are = G.rects_are_overlapping_wrapH(r, padded, db.shared.world.bounds0);
            return are ? padded : undefined;
        });
        if (hit_m != undefined) {
            slt = G.v2d_add(slt, G.v2d_x0(hit_m.size));
        }
        --loop_max;
    } while ((hit_e != undefined || hit_m != undefined) && loop_max > 0);
    return slt;
}
