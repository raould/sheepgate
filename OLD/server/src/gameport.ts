/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as F from './facing';
import * as S from './sprite';
import * as K from './konfig';
import * as D from './debug';
import { DebugGraphics } from './debug_graphics';
import * as U from './util/util';

// magic numbers ahead, beware.
// note: i bet this was all done in like 4 lines of machine code in Defender/Stargate.
// the dynamics here aren't as good as real stargate, either.
// todo: i have seen bugs where the player breaks free of the zone somehow.

export function gameport_step(db: GDB.GameDB) {
    U.if_lets(
        [GDB.get_player(db.local.prev_db), GDB.get_player(db)],
        all => {
            const [p0, p1] = all;
            const pm = G.rect_mid(p1);
            const vp = db.shared.world.gameport.world_bounds;
            set_player_zone_width(db, p0, p1);
            wrap(db, p0, p1);
            apply_step(db, p1);
            G.rect_set_mid_mut(
                db.shared.world.gameport.enemy_firing_bounds,
                G.rect_mid(db.shared.world.gameport.world_bounds)
            );
        }
    );
    step_player_zone_width(db);
    D.assert(G.v2d_eq(
        db.shared.world.gameport.world_bounds.size,
        db.shared.world.gameport.screen_bounds.size
    ));
}

function wrap(db: GDB.GameDB, p0: S.Player, p1: S.Player) {
    // todo: what if we add a player hyperspacing ability?
    const diff_px = p1.lt.x - p0.lt.x;
    const vp1 = db.local.prev_db.shared.world.gameport.world_bounds;
    if (Math.abs(diff_px) > (vp1.size.x*0.8)) {
        // smells like the player has world-wrapped, so must the gameport.
        // an issue is figuring out how much to wrap the gameport. wrapping by
        // the diff_px is empirically not smooth, dunno why.
        const warp = G.v2d_mk_x0(U.sign(diff_px) * db.shared.world.bounds0.x);
        G.rect_move_mut(
            db.shared.world.gameport.world_bounds,
            warp
        );
    }
    // todo: what if the player is somehow super utterly off-gameport?
}

function apply_step(db: GDB.GameDB, p: S.Player) {
    step_x(db, p);
}

function limit_x(db: GDB.GameDB, pm: G.V2D, target: G.V2D, leading: G.V2D) {
    // if the player moved outside the zone, jump so they are on the correct edge.
    const maybe_jump = !G.v2d_inside_x(pm, target, leading);
    if (maybe_jump) {
        const dt = G.smallest_diff_wrapped(pm.x, target.x, db.shared.world.bounds0.x);
        const dl = G.smallest_diff_wrapped(pm.x, leading.x, db.shared.world.bounds0.x);
        const jump = pm.x - ((dt < dl) ? target.x : leading.x);
        G.rect_move_mut(db.shared.world.gameport.world_bounds, G.v2d_mk_x0(jump));
    }    
}

function step_x(db: GDB.GameDB, p: S.Player) {
    // if the player is 'ahead' of the zone, given their facing, then make
    // sure they don't escape the player zone even if they are thrusting.
    // todo: seen bugs tho.
    const vp = db.shared.world.gameport.world_bounds;
    const pm = G.rect_mid(p);
    const [target, leading] = player_to_zone(db, p, vp);
    DebugGraphics.add_point(DebugGraphics.get_frame(), target);
    DebugGraphics.add_point(DebugGraphics.get_frame(), leading);
    limit_x(db, pm, target, leading);

    // step toward them in the zone, so they move
    // 'back' away from the 'leading' toward the 'target' edge.
    const sign = F.f2x(p.facing);
    const diff_x = pm.x - target.x;
    const ahead = U.sign(diff_x) == sign;
    // if (ahead) {
    // 	const dtsf = K.GAMEPORT_PLAYER_ZONE_STEP_X * db.local.frame_dt;
    //     const step_x = Math.min(Math.abs(diff_x / 2), dtsf) * sign;
    //     G.rect_move_mut(
    //         db.shared.world.gameport.world_bounds,
    //         G.v2d_mk_x0(step_x)
    //     );
    // }
}

function player_to_zone(db: GDB.GameDB, player: S.Player, gameport: G.Rect): [G.V2D/*target*/, G.V2D/*leading*/] {
    const vp = db.shared.world.gameport.world_bounds;
    const target = F.on_facing(player.facing,
        G.v2d_sub(G.rect_rm(vp), K.GAMEPORT_PLAYER_ZONE_INSET),
        G.v2d_add(G.rect_lm(vp), K.GAMEPORT_PLAYER_ZONE_INSET)
    );
    const delta = G.v2d_mk_x0(
        F.on_facing(player.facing,
            -db.local.player_zone_width,
            db.local.player_zone_width
        )
    );
    const leading = G.v2d_add(target, delta);
    return [target, leading];
}

function set_player_zone_width(db: GDB.GameDB, p0: S.Player, p1: S.Player) {
    // on player reversing direction, make the zone large and shrink it over time.
    // todo: i've seen a bug where the leading zone point is lost / way off screen!?
    if (p0.facing != p1.facing) {
        const vp = db.shared.world.gameport.world_bounds;
        const [target, _] = player_to_zone(db, p1, vp);
        db.local.player_zone_width = Math.abs(G.v2d_sub(G.rect_mid(p1), target).x);
    }
}

function step_player_zone_width(db: GDB.GameDB) {
    const dtsf = K.GAMEPORT_PLAYER_ZONE_STEP_X * db.local.frame_dt;
    const pzw2 = db.local.player_zone_width - dtsf;
    db.local.player_zone_width = Math.max(
        pzw2,
        K.GAMEPORT_PLAYER_ZONE_MIN_WIDTH
    );
}
