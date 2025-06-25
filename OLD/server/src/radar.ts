/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as S from './sprite';
import { RGBA } from './color';
import * as U from './util/util';
import * as K from './konfig';

export function step(db: GDB.GameDB) {
    clear_radar(db);
    U.if_let(
        GDB.get_player(db),
        player => {
            // todo: when drawing the rects in the radar we want to fit fully inside
            // but the way this works is simplistic (!) so they can visually overlap the top bounds.
            render_ground(db);
            render_enemies(db, player);
            render_munchies(db, player);
            render_gems(db, player);
            render_base(db, db.shared.items.base, player);
            render_people(db, player);
            render_player(db, player);
        }
    );
}

function clear_radar(db: GDB.GameDB) {
    db.shared.hud_drawing.rects.push({
        wrap: false,
        line_width: 0,
        color: K.RADAR_FILL_COLOR,
        is_filled: true,
        rect: db.local.hud.radar.rect
    });
    db.shared.hud_drawing.rects.push({
        wrap: false,
        line_width: 1,
        color: K.RADAR_OUTLINE_COLOR,
        is_filled: false,
        rect: db.local.hud.radar.rect
    });
}

function world2radarUnclipped(db: GDB.GameDB, rect: S.Sprite, player: S.Sprite): G.Rect {
    // in theory, the rects given to us are already world-wrapped.
    // but we'll be centering the radar on the player so we'll have to radar-wrap.
    const radar = db.local.hud.radar.inset_rect;
    const prm = G.v2d_scale_v2d(G.rect_mid(player), db.local.hud.radar.scale);
    const r2c = G.v2d_mk(radar.size.x/2 - prm.x, 0);
    const r = G.rect_scale_v2d(rect, db.local.hud.radar.scale);
    const rc = G.rect_move(r, r2c);
    const rcw = G.rect_wrapH(rc, radar.size);
    const ru = G.rect_move(rcw, radar.lt);
    // ensure sprites far above the world bounds still appear on radar.
    if (G.rect_b(ru) < G.rect_t(radar)) {
        return G.rect_mk(
            G.v2d_mk(G.rect_l(ru), G.rect_t(radar)),
            G.v2d_mk(G.rect_w(ru), 2)
        );
    }
    G.rect_set_size_mut(
        ru,
        G.v2d_max(ru.size, K.RADAR_RECT_MIN_SIZE)
    )
    return ru;
}

function world2radar(db: GDB.GameDB, rect: S.Sprite, player: S.Sprite): G.Rect {
    const s = world2radarUnclipped(db, rect, player);
    const radar = db.local.hud.radar.inset_rect;
    return G.rect_clipH_inside(s, radar) || s;
}

function world2radars(db: GDB.GameDB, rect: S.Sprite, player: S.Sprite): G.Rect[] {
    const radar = db.local.hud.radar.inset_rect;
    const s = world2radarUnclipped(db, rect, player);
    const all = [s, ...G.rect_siblingsH(s, radar)]
        .map(r => G.rect_clipH_inside(r, radar))
        .filter(U.exists);
    return all;
}

function render_ground(db: GDB.GameDB) {
    // todo: blah this could really all be long-term constant stuff, it never changes.
    const radar = db.local.hud.radar.inset_rect;
    const gy = db.shared.world.ground_y;
    const ry = gy * db.local.hud.radar.scale.y;
    const rv = G.v2d_mk(0, ry);
    const p0 = G.v2d_add(G.rect_lt(radar), rv);
    const p1 = G.v2d_add(G.rect_rt(radar), rv);
    db.shared.hud_drawing.lines.push({
        wrap: false,
        line_width: 1,
        color: RGBA.GRAY,
        p0: p0,
        p1: p1
    });
    // todo: i have no idea how to do the buildings or mountains.
}

function render_player(db: GDB.GameDB, sprite: S.Player) {
    // since the player is kept in the center
    // there's no need to draw sibling rectangles.
    const r = world2radar(db, sprite, sprite);
    db.shared.hud_drawing.rects.push({
        wrap: false,
        line_width: 0,
        color: K.PLAYER_COLOR,
        is_filled: true,
        rect: r
    });
}

function render_people(db: GDB.GameDB, center: S.Player) {
    Object.values(db.shared.items.people).forEach(sprite => {
	if (sprite.beaming_state == S.BeamingState.not_beaming) {
            const rs = world2radars(db, sprite, center);
            rs.forEach(r => {
		db.shared.hud_drawing.rects.push({
		    wrap: false,
		    line_width: 0,
		    color: RGBA.YELLOW,
		    is_filled: true,
		    rect: r
		})
	    });
	}
    });
}

function render_base(db: GDB.GameDB, sprite: S.Base, center: S.Player) {
    const rs = world2radars(db, sprite, center);
    rs.forEach(r =>
        db.shared.hud_drawing.rects.push({
            wrap: false,
            line_width: 1,
            color: K.GOOD_COLOR,
            is_filled: true,
            rect: r
        })
    );
}

function render_enemies(db: GDB.GameDB, center: S.Player) {
    Object.values(db.shared.items.enemies).forEach(sprite => {
        const rs = world2radars(db, sprite, center);
        rs.forEach(r =>
            db.shared.hud_drawing.rects.push({
                wrap: false,
                line_width: 0,
                color: K.BAD_COLOR,
                is_filled: true,
                rect: r,
                comment: `r-enemy-${sprite.dbid}`
            })
        );
    });
}

function render_munchies(db: GDB.GameDB, center: S.Player) {
    Object.values(db.shared.items.munchies).forEach(sprite => {
        const rs = world2radars(db, sprite, center);
        rs.forEach(r =>
            db.shared.hud_drawing.rects.push({
                wrap: false,
                line_width: 0,
                color: K.BAD_COLOR,
                is_filled: true,
                rect: r,
                comment: `r-munchie-${sprite.dbid}`
            })
        );
    });
}

function render_gems(db: GDB.GameDB, center: S.Player) {
    Object.values(db.shared.items.gems).forEach(sprite => {
        const rs = world2radars(db, sprite, center);
        rs.forEach(r =>
            db.shared.hud_drawing.rects.push({
                wrap: false,
                line_width: 0,
                color: K.GOOD_COLOR,
                is_filled: true,
                rect: r,
                comment: `r-gem-${sprite.dbid}`
            })
        );
    });
}
