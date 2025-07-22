/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as S from './sprite';
import { RGBA } from './color';
import * as U from './util/util';
import * as K from './konfig';

export function step(db: GDB.GameDB) {
    clear_radar(db);
    const center = G.rect_mid(db.shared.world.gameport.world_bounds);
    U.if_let(
        GDB.get_player(db),
        player => {
            // todo: when drawing the rects in the radar we want to fit fully inside
            // but the way this works is simplistic (!) so they can visually overlap the top bounds.
            render_ground(db);
            render_enemies(db, center);
            render_indestructibles(db, center);
            render_munchies(db, center);
            render_gems(db, center);
            render_base(db, db.shared.items.base, center);
            render_people(db, center);
            render_player(db, player, center);
	    render_gameport(db);
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

function world2radarUnclipped(db: GDB.GameDB, rect: S.Sprite, center: G.V2D): G.Rect {
    // in theory, the rects given to us are already world-wrapped.
    // but we'll be centering the radar based on the scrolled gameport
    // so we have to re-do the wrap.
    const radar = db.local.hud.radar.inset_rect;
    const prm = G.v2d_scale_v2d(
	center,
	db.local.hud.radar.scale
    );
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

function world2radar(db: GDB.GameDB, rect: S.Sprite, center: G.V2D): G.Rect {
    const s = world2radarUnclipped(db, rect, center);
    const radar = db.local.hud.radar.inset_rect;
    return G.rect_clipH_inside(s, radar) || s;
}

function world2radars(db: GDB.GameDB, rect: S.Sprite, center: G.V2D): G.Rect[] {
    const radar = db.local.hud.radar.inset_rect;
    const s = world2radarUnclipped(db, rect, center);
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
        color: K.RADAR_GROUND_COLOR,
        p0: p0,
        p1: p1
    });
    // todo: i have no idea how to do the buildings or mountains.
}

function render_gameport(db: GDB.GameDB) {
    const ww = db.shared.world.bounds0.x;
    const gw = db.shared.world.gameport.world_bounds.size.x;
    const ow = (ww-gw)/2 * db.local.hud.radar.scale.x;
    const r = G.rect_inset(
	db.local.hud.radar.rect,
	G.v2d_mk(ow, 0)
    );
    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: r.lt,
	p1: G.v2d_add_y(r.lt, K.RADAR_GAMEPORT_NOTCH_LENGTH)
    });
    const lb = G.rect_lb(r);
    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: lb,
	p1: G.v2d_add_y(lb, -K.RADAR_GAMEPORT_NOTCH_LENGTH)
    });
    const rt = G.rect_rt(r);
    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: rt,
	p1: G.v2d_add_y(rt, K.RADAR_GAMEPORT_NOTCH_LENGTH)
    });
    const rb = G.rect_rb(r);
    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: rb,
	p1: G.v2d_add_y(rb, -K.RADAR_GAMEPORT_NOTCH_LENGTH)
    });

    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: r.lt,
	p1: rt,
    });
    db.shared.hud_drawing.lines.push({
	wrap: false,
	line_width: K.RADAR_GAMEPORT_NOTCH_WIDTH,
	color: K.RADAR_OUTLINE_COLOR,
	p0: lb,
	p1: rb,
    });
}

function render_player(db: GDB.GameDB, player: S.Player, center: G.V2D) {
    const r = world2radar(db, player, center);
    db.shared.hud_drawing.rects.push({
        wrap: false,
        line_width: 0,
        color: K.PLAYER_COLOR,
        is_filled: true,
        rect: r
    });
}

function render_people(db: GDB.GameDB, center: G.V2D) {
    Object.values(db.shared.items.people).forEach(sprite => {
	if (sprite.beaming_state == S.BeamingState.not_beaming) {
            const rs = world2radars(db, sprite, center);
            rs.forEach(r => {
		db.shared.hud_drawing.rects.push({
		    wrap: false,
		    line_width: 0,
		    color: K.RADAR_PEOPLE_COLOR,
		    is_filled: true,
		    rect: r
		})
	    });
	}
    });
}

function render_base(db: GDB.GameDB, sprite: S.Base, center: G.V2D) {
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

function render_enemies(db: GDB.GameDB, center: G.V2D) {
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

function render_indestructibles(db: GDB.GameDB, center: G.V2D) {
    Object.values(db.shared.items.indestructibles).forEach(sprite => {
        const rs = world2radars(db, sprite, center);
        rs.forEach(r =>
            db.shared.hud_drawing.rects.push({
                wrap: false,
                line_width: 0,
                color: K.BAD_COLOR,
                is_filled: true,
                rect: r,
                comment: `r-indestructible-${sprite.dbid}`
            })
        );
    });
}

function render_munchies(db: GDB.GameDB, center: G.V2D) {
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

function render_gems(db: GDB.GameDB, center: G.V2D) {
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
