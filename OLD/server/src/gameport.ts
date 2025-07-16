/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as F from './facing';
import * as S from './sprite';
import * as K from './konfig';
import * as D from './debug';
import { DebugGraphics } from './debug_graphics';
import * as U from './util/util';

// todo: so many bugs probably, likely related to wrapping.
// probably all the math needs to be done unwrapped until the last second.
// (AND todo: should really have newtypes for unwrapped vs. wrapped, ugh.)
/*
  - want to do all math in non-wrapped coordinates.
  - gameport might cross world bounds so lt vs. rt are wrapped differently.
  - player prev/current might be wrapped vs. gameport.
  - player prev/current might be wrapped vs. current/prev.
SO:
  - assume the player is in the gameport. (but with bugs, not always true!)
  - use the gameport left & right to detect wrapping.
  - if wrapping detected, convert gameport right to unwrapped.
  - if wrapping detected, convert prev/current player to unwrapped.
  - do the math.
  - convert back to wrapped.
*/

// magic numbers ahead, beware.
// note: i bet this was all done in like 4 lines of machine code in Defender/Stargate.
// the dynamics here aren't as good as real stargate, either.
// todo: i have seen bugs where the player breaks free of the zone somehow.
// note: yeah i have no idea how this works any more.

export function gameport_step(db: GDB.GameDB) {
    U.if_lets(
        [GDB.get_player(db.local.prev_db), GDB.get_player(db)],
        ([p0, p1]) => {
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

function set_player_zone_width(db: GDB.GameDB, p0: S.Player, p1: S.Player) {
    // on player reversing direction, make the zone large and shrink it over time.
    // todo: i've seen a bug where the leading zone point is lost / way off screen!?
    if (p0.facing != p1.facing) {
        const target = facing_to_zone_target(db, p1.facing);
	// the reality of the situation is the current player's distance from target,
	// even if it is larger than some zome max width we'd really like.
        db.local.player_zone_width = G.smallest_diff_wrapped(
	    G.rect_mx(p1),
	    target.x,
	    db.shared.world.bounds0.x
	);
	// D.log(U.F2D(db.shared.world.bounds0.x),
	//       U.F2D(G.rect_lm(db.shared.world.gameport.world_bounds).x),
	//       U.F2D(G.rect_rm(db.shared.world.gameport.world_bounds).x),
	//       U.F2D(p1.lt.x),
	//       U.F2D(target.x),
	//       U.F2D(db.local.player_zone_width));
    }
}

function facing_to_zone_target(db: GDB.GameDB, facing: F.Facing): G.V2D {
    const vp = db.shared.world.gameport.world_bounds;
    const target = F.on_facing(facing,
        G.v2d_sub(G.rect_rm(vp), K.GAMEPORT_PLAYER_ZONE_INSET),
        G.v2d_add(G.rect_lm(vp), K.GAMEPORT_PLAYER_ZONE_INSET)
    );
    return target;
}

function facing_to_zone_leading(db: GDB.GameDB, facing: F.Facing, target?: G.V2D): G.V2D {
    const vp = db.shared.world.gameport.world_bounds;
    const delta = G.v2d_mk_x0(
        F.on_facing(
	    facing,
            -db.local.player_zone_width,
            db.local.player_zone_width
        )
    );
    return G.v2d_add(
	target ?? F.on_facing(
	    facing,
	    G.v2d_sub(G.rect_rm(vp), K.GAMEPORT_PLAYER_ZONE_INSET),
	    G.v2d_add(G.rect_lm(vp), K.GAMEPORT_PLAYER_ZONE_INSET)
	),
	delta);
}

function step_player_zone_width(db: GDB.GameDB) {
    const dtsf = K.GAMEPORT_PLAYER_ZONE_STEP_X * db.local.frame_dt;
    const pzw2 = db.local.player_zone_width - dtsf;
    db.local.player_zone_width = Math.max(
        pzw2,
        K.GAMEPORT_PLAYER_ZONE_MIN_WIDTH
    );
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

function step_x(db: GDB.GameDB, player: S.Player) {
    // if the player is 'ahead' of the zone, given their facing, then make
    // sure they don't escape the player zone even if they are thrusting.
    // todo: seen bugs tho.
    const pm = G.rect_mid(player);
    const target = facing_to_zone_target(db, player.facing);
    const leading = facing_to_zone_leading(db, player.facing);
    DebugGraphics.add_point(DebugGraphics.get_frame(), target);
    DebugGraphics.add_point(DebugGraphics.get_frame(), leading);

    // if the player moved outside the zone, jump so they are on the correct edge.
    const maybe_jump = !G.v2d_inside_x(pm, target, leading);
    if (maybe_jump) {
        const dt = G.smallest_diff_wrapped(pm.x, target.x, db.shared.world.bounds0.x);
        const dl = G.smallest_diff_wrapped(pm.x, leading.x, db.shared.world.bounds0.x);
        const jump = pm.x - ((dt < dl) ? target.x : leading.x);
        G.rect_move_mut(db.shared.world.gameport.world_bounds, G.v2d_mk_x0(jump));
    }    
}
