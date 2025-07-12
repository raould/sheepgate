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
    const sltve = safe_lt_vs_enemy(db, rank, size, rnd, lt);
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
export function safe_lt_vs_enemy(db: GDB.GameDB, rank: S.Rank, size: G.V2D, rnd: Rnd.Random, lt: G.V2D | undefined): G.V2D {
    let slt = lt ?? Gr.v2d_random_inxy(rnd, db.shared.world.bounds0.x, size.y);
    if (rank != S.Rank.basic) {
	const rw = size.x * 2;
	const rs = [...Array(Math.ceil(db.shared.world.bounds0.x / rw)).keys()].map((e) => 0);
	const rsl = rs.length;
	for (const e of Object.values(db.shared.items.enemies)) {
	    if ((e as S.Enemy).rank === rank) {
		const mx = e.lt.x + size.x/2;
		const i = Math.ceil(mx / rw);
		const l = (i + Math.ceil(rsl / 2)) % rsl; // opposite side of the world.
		rs[l]++;
	    }
	}
	let besti = rs.reduce((bi,_,i) => rs[i] > rs[bi] ? i : bi);
	if (besti === 0 && rs[besti] === 0) {
	    besti = rnd.int_range(0, rsl);
	}
	slt = G.v2d_mk(besti*rw, slt.y);
    }
    return slt;
}
