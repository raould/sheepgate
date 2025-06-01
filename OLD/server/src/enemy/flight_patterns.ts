/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as K from '../konfig';
import * as G from '../geom';
import * as S from '../sprite';
import * as Tkg from '../ticking_generator';
import * as Rnd from '../random';
import * as F from '../facing';
import * as U from '../util/util';
import { RGBA } from '../color';
import { DebugGraphics } from '../debug_graphics';
import * as D from '../debug';

// some (mostly lame, crappy) movement behaviors.

// note: enemies are thrusted from their midpoint,
// so these should (todo) calculate based on that.

// todo: these should be sure not to make the
// sprites go off screen or anything else silly. :-(
// fix the logic, it is all kinda incorrect crap, unfortunately.

const TOP_PAD = 10;
const BOTTOM_PAD = 50;

export interface FlightPattern {
    // note: 'src' has to be a valid reference in the given db instance
    // otherwise they will be out of sync and the changes to the
    // src will be broken on the next simulation step.
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D;
}

function rect_in_bounds_y(db: GDB.GameDB, r: G.Rect, top_pad: number, bottom_pad: number): G.Rect {
    // have to make sure the (1) enemy, (2) shield, (3) hp bar are visible.
    // todo: this is all a hack, is not really accurate.
    const lt = G.rect_lt(r);
    const rh = G.rect_h(r);
    const sh = rh * K.SHIELD_SCALE.y;
    // try to avoid overlapping the top of the screen.
    const min_y = K.SHIELD_BAR_HEIGHT + K.SHIELD_BAR_OFFSET_Y + sh/2 + top_pad;
    // try to avoid overlapping the ground, also try to avoid overlapping the base.
    const max_y = db.shared.world.ground_y - (K.BASE_SIZE.y * K.BASE_SHIELD_SCALE.y) - sh - bottom_pad;
    const y = Math.max(min_y, Math.min(max_y, lt.y));
    return G.rect_set_lt(r, G.v2d_set_y(lt, y));
}

function calculate_acc(src: G.V2D, dst: G.V2D, acc_mag: number, dt: number): G.V2D {
    const delta_acc = G.v2d_scale(
        G.v2d_norm(
            G.v2d_sub(dst, src)
        ),
        acc_mag
    );
    return delta_acc;
}

// sorta like: fly at the player, then turn around and repeat.
// todo: would be nice if the patterns could react to e.g. being shot.
export class BuzzPlayer implements FlightPattern {
    private static NEXT_SEEK_MSEC = 5*1000;
    private acc_mag: G.V2D;
    private next_seek_msec: number;

    constructor(db: GDB.GameDB, acc_mag: G.V2D) {
        this.acc_mag = acc_mag;
        this.next_seek_msec = 0;
    }

    // TODO: src: react to player's shots.
    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
        const dx = this.step_x(db, src);
        const dy = this.step_y(db, src);
        const delta_acc = G.v2d_mk(dx, dy);
        DebugGraphics.add_DrawLine(
            DebugGraphics.get_frame(),
            {
                color: RGBA.YELLOW,
                line_width: 2,
                p0: G.rect_mid(src),
                p1: G.v2d_add(G.rect_mid(src), G.v2d_scale(G.v2d_norm(delta_acc), 100)),
                wrap: false
            }
        );
        return delta_acc;
    }

    private step_x(db: GDB.GameDB, src: S.Enemy): number {
        let x2p: U.O<number>;
        if (db.shared.sim_now >= this.next_seek_msec) {
            this.next_seek_msec = db.shared.sim_now + BuzzPlayer.NEXT_SEEK_MSEC;
            x2p = U.if_let(
                GDB.get_player(db),
                player => {
                    const diff = G.v2d_shortest_vec(src.lt, player.lt, db.shared.world.bounds0);
                    DebugGraphics.add_DrawLine(
                        DebugGraphics.get_frame(),
                        {
                            color: RGBA.YELLOW,
                            line_width: 2,
                            p0: G.rect_mid(src),
                            p1: G.v2d_add(G.rect_mid(src), diff),
                            wrap: false
                        }
                    );
                    const sign = U.sign(diff.x);
                    return this.acc_mag.x * sign;
                },
            );
        }
        return x2p || this.acc_mag.x * F.on_facing(src.facing, -1, 1);
    }

    private step_y(db: GDB.GameDB, src: S.Enemy) {
        const y2p = U.if_let(
            GDB.get_player(db),
            player => {
                // todo: ugh this can still overshoot y.
                const safe_player = rect_in_bounds_y(db, player, TOP_PAD, BOTTOM_PAD);
                const target_y = G.rect_mid(safe_player).y;
                const diff = target_y - G.rect_mid(src).y;
                const sign = U.sign(diff);
                const t = U.clip01(Math.abs(diff / (G.rect_h(src) * 2)));
                return this.acc_mag.y * sign * t;
            }
        );
        return y2p || 0;
    }
}

export class TargetPlayer implements FlightPattern {
    target: G.V2D;
    private acc_mag: number;
    private ticker: Tkg.TickingGenerator<G.V2D>;

    constructor(db: GDB.GameDB, tick_msec: number, acc_mag: number) {
        this.target = G.rect_mid(db.shared.world.gameport.world_bounds);
        this.acc_mag = acc_mag;
        this.ticker = Tkg.ticking_generator_mk(
            db,
            GDB.id_mk(),
            {
                tick_msec: tick_msec,
                generate: (db: GDB.GameDB): U.O<G.V2D> => {
                    return U.if_let(
                        GDB.get_player(db),
                        p => G.rect_mid(rect_in_bounds_y(db, p, TOP_PAD, BOTTOM_PAD))
                    )
                }
            }
        );
    }

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
        U.if_let(
            this.ticker.step(db),
            t => this.target = t
        );
        const delta_acc = calculate_acc(G.rect_mid(src), this.target, this.acc_mag, db.local.frame_dt);
        return delta_acc;
    }
}

// follow a sinusoidal-ish horizontal path.
export class DecendAndGoSine implements FlightPattern {
    private target: G.V2D;
    private acc_mag: number;
    private signX: number;
    private mid_y: number;
    private sinY: number;
    private period_factor: number;

    // up to the caller to adjust y? by size.y.
    constructor(db: GDB.GameDB, size: G.V2D, acc_mag: number, y?: number) {
        const world_rect = db.shared.world.gameport.world_bounds;
        this.target = G.rect_mid(world_rect); // temporary non-null value until we step.
	const rnd_y = Rnd.singleton.float_range(
	    G.rect_t(K.GAMEPORT_RECT) + TOP_PAD + (size.y*2),
	    G.rect_b(K.GAMEPORT_RECT) - BOTTOM_PAD - (size.y*2),
	);
	this.mid_y = y ?? rnd_y;
	this.period_factor = Rnd.singleton.float_around(2000, 250);
	this.sinY = size.y;
        this.signX = Rnd.singleton.boolean() ? -1 : 1;
        this.acc_mag = acc_mag;
    }

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
	const now = db.shared.sim_now;
	const sin_y = Math.sin(now/this.period_factor) * this.sinY;
        const smid = G.rect_mid(src);
        this.target = G.v2d_mk(
	    smid.x + this.signX * 100,
	    this.mid_y + sin_y
	);
        const delta_acc = calculate_acc(G.rect_mid(src), this.target, this.acc_mag, db.local.frame_dt);

	DebugGraphics.add_point(
	    DebugGraphics.get_frame(),
	    this.target,
	);
	DebugGraphics.add_DrawLine(
	    DebugGraphics.get_frame(),
	    {
		wrap: false,
		color: RGBA.BLUE,
		line_width: 3,
		p0: smid,
		p1: this.target,
	    }
	);
	DebugGraphics.add_DrawLine(
	    DebugGraphics.get_frame(),
	    {
		wrap: true,
		color: RGBA.YELLOW,
		line_width: 1,
		p0: { x: 0, y: this.mid_y },
		p1: { x: K.SCREEN_BOUNDS0.x, y: this.mid_y }
	    }
	);

        return delta_acc;
    }
}

export class DescendAndGoStraight implements FlightPattern {
    private target: G.V2D;
    private dst_y: number | undefined;
    private acc_mag: number;
    private normal: G.V2D;

    // up to the caller to adjust y? by size.y.
    constructor(db: GDB.GameDB, size: G.V2D, acc_mag: number, y?: number) {
        const world_rect = db.shared.world.gameport.world_bounds;
        this.target = G.rect_mid(world_rect); // temporary non-null value until we step.
	const rnd_y = Rnd.singleton.float_range(
	    G.rect_t(K.GAMEPORT_RECT) + TOP_PAD + size.y,
	    G.rect_b(K.GAMEPORT_RECT) - BOTTOM_PAD - size.y,
	);
        this.dst_y = y ?? rnd_y;
        this.acc_mag = acc_mag;
        this.normal = G.v2d_mk_x0(Rnd.singleton.sign() * 100);
    }

    step_delta_acc(db: GDB.GameDB, src: S.Enemy): G.V2D {
        const smid = G.rect_mid(src);
        if (U.exists(this.dst_y) && smid.y < this.dst_y) {
	    // +10 to overshoot, making sure to actually reach dst_y.
            this.target = G.v2d_mk(smid.x, this.dst_y + 10);
        }
        else {
	    this.dst_y = undefined;
            this.target = G.v2d_add(smid, this.normal);
        }
	DebugGraphics.add_DrawLine(
            DebugGraphics.get_frame(),
            {
                color: RGBA.randomRGB(Rnd.singleton),
                line_width: 2,
                p0: smid,
		// misleading since it includes the +10,
                p1: this.target,
                wrap: false
            }
	)
        const delta_acc = calculate_acc(G.rect_mid(src), this.target, this.acc_mag, db.local.frame_dt);
        return delta_acc;
    }
}
