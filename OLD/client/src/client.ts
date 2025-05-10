// todo: figure out the living hell that is 
// packaging for the browser, so that this
// can be split up & also share code w/ the server.
import { beamdown_sfx_b64 } from './beamdown.ogg.b64';
import { beamup_sfx_b64 } from './beamup.ogg.b64';
import { explosion_sfx_b64 } from './explosion.ogg.b64';
import { gem_collect_sfx_b64 } from './gem_collect.ogg.b64';
import { player_shoot_sfx_b64 } from './player_shoot.ogg.b64';
import { Gamepads, StandardMapping } from './gamepads';
import { FPS } from './fps';

// todo: use the server types.
let server_db: any;

// todo: turn all this into an encapsulating instance.

let inputs: {commands: {[k:string]:boolean}, keys: {[k:string]:boolean}} = {
    commands: {}, keys: {}
};
// todo: unfortunately if is_stepping is true at the start, things break. fix it!
let debugging_state: any = { is_stepping: false, is_drawing: false, is_annotating: false };
let particles: {[k:string]:ParticlesEllipseGenerator} = {};
let socket_ws: any;
let h5canvas: any;
let contextAudio: any;
let cx2d: any;
let sounds: any = {};
let images: any = {};
let last_render_msec = 0;
let game_fps = 0;
let fps = new FPS((fps) => { game_fps = fps; });
let tick = 0;
let currentGamepad: any;
const server_host: string = "localhost";
const ws_endpoint: string = `ws://${server_host}:6969`;
const BG_COLOR: string = "#111133";
const DEBUG_IMG_BOX_COLOR: string = "rgba(255,0,0,0.5)";
const client_id = Date.now()
// todo: game breaks when the fps is set to anything other than 30.
// also requestAnimationFrame() never gives me more than 30 fps anyway?
const TARGET_FPS = 30;
const MSEC_PER_FRAME = 1000 / TARGET_FPS;
log("client_id", client_id);

// todo: 'command' is a bad name beacuse it sounds
// like single fire messages, but this is really
// more a keyspressedmap or a commandsactivemap or something.
// match: todo: make this stuff common with the server.
interface CommandSpec {
    command: CommandType;
    is_singular: boolean;
}
enum CommandType {
    pause = "pause",
    high_score = "high_score",
    fire = "fire",
    up = "up",
    down = "down",
    left = "left",
    right = "right",
    turbo = "turbo",
    debug_toggle_graphics = "debug_toggle_graphics",
    debug_toggle_annotations = "debug_toggle_annotations",
    debug_toggle_stepping = "debug_toggle_stepping",
    debug_step_frame = "debug_step_frame",
    debug_dump_state = "debug_dump_state",
    debug_win_level = "debug_win_level",
    debug_lose_level = "debug_lose_level",
}
// todo: share this (unfortunately) with the server, esp. the "is_singular" part.
// is_singular true means there's no auto-repeat while the key is held down.
const PauseSpec: CommandSpec = { command: CommandType.pause, is_singular: true };
const HighScoreSpec: CommandSpec = { command: CommandType.high_score, is_singular: true };
const FireSpec: CommandSpec = { command: CommandType.fire, is_singular: false };
const UpSpec: CommandSpec = { command: CommandType.up, is_singular: false };
const DownSpec: CommandSpec = { command: CommandType.down, is_singular: false };
const LeftSpec: CommandSpec = { command: CommandType.left, is_singular: false };
const RightSpec: CommandSpec = { command: CommandType.right, is_singular: false };
const TurboSpec: CommandSpec = { command: CommandType.turbo, is_singular: false };
const key2cmd: { [k: string]: CommandSpec } = {
    // standard gameplay commands.
    Escape:     PauseSpec,
    p:     	PauseSpec,
    P:     	PauseSpec,
    h:          HighScoreSpec,
    H:          HighScoreSpec,
    " ":        FireSpec,
    z:          FireSpec,
    Z:          FireSpec,
    Enter:      FireSpec,
    ArrowUp:    UpSpec,
    w:          UpSpec,
    W:          UpSpec,
    ArrowDown:  DownSpec,
    s:          DownSpec,
    S:          DownSpec,
    ArrowLeft:  LeftSpec,
    a:          LeftSpec,
    A:          LeftSpec,
    ArrowRight: RightSpec,
    d:          RightSpec,
    D:          RightSpec,
    Shift:      TurboSpec,
    // secret debugging stuff.
    ".":        { command: CommandType.debug_step_frame, is_singular: true },
    "!":        { command: CommandType.debug_dump_state, is_singular: true },
    b:          { command: CommandType.debug_toggle_graphics, is_singular: true }, // de"b"ug mnemonic :-(
    n:          { command: CommandType.debug_toggle_annotations, is_singular: true },
    "/":        { command: CommandType.debug_toggle_stepping, is_singular: true },
    "^":        { command: CommandType.debug_win_level, is_singular: true },
    "&":        { command: CommandType.debug_lose_level, is_singular: true },
};

class ParticlesEllipseGenerator {
    // "o" means "offset" because we're keeping the particles
    // as just a long array-of-structs that is nothing but floats.
    // (todo: yes there's maybe still a bug where the generator might
    // live longer than it should and animates a 2nd time.)
    ox = 0;
    oy = 1;
    ovx = 2;
    ovy = 3; ostep = this.ovy+1;
    pdim = 2;
    count: number;
    start_msec: number;
    duration_msec: number;
    gravity: number;
    particles: Float32Array;
    constructor(count: number, duration_msec: number, start_msec: number, speed: number, vel: any/*G.V2D*/, bounds: any/*G.Rect*/, gravity: number) {
        this.count = count;
        this.duration_msec = duration_msec;
        this.start_msec = start_msec;
        this.gravity = gravity;
        this.particles = new Float32Array(this.count * this.ostep);
        const mx = bounds.lt.x + bounds.size.x/2;
        const my = bounds.lt.y + bounds.size.y/2;
        const rx = bounds.size.x/2;
        const ry = bounds.size.y/2;
        const vx = vel.x;
        const vy = vel.y;
        for (let i = 0; i < this.count; i += this.ostep) {
            // todo: shared libs with server so we can have the random lib, geom lib, etc.
            // todo: this isn't generating "fair" particles so the explosions look a little weird.
            const radians = Math.random() * Math.PI * 2;
            const ix = mx + rx * Math.cos(radians);
            const iy = my + ry * Math.sin(radians);
            this.particles[i + this.ox] = ix;
            this.particles[i + this.oy] = iy;
            const ivx = ix - mx;
            const ivy = iy - my;
            const d = Math.sqrt(ivx * ivx + ivy * ivy);
            this.particles[i + this.ovx] = vx + ivx / d * speed * (Math.random() + 0.5);
            this.particles[i + this.ovy] = vy + ivy / d * speed * (Math.random() + 0.5);
        }
    }
    age_t(gdb: any): number {
        const elapsed_msec = gdb.sim_now - this.start_msec;
        const t = elapsed_msec / this.duration_msec
        return t;
    }
    // note: this is step() and render() together in one.
    render(gdb: any, h5canvas: any) {
        const elapsed_msec = gdb.sim_now - this.start_msec;
        for (let i = 0; i < this.count; i += this.ostep) {
            const x0 = this.particles[i + this.ox];
            const y0 = this.particles[i + this.oy];
            const vx = this.particles[i + this.ovx];
            const vy = this.particles[i + this.ovy];
            const gy = this.gravity * elapsed_msec;
            const x1 = x0 + vx * elapsed_msec;
            const y1 = y0 + (vy + gy) * elapsed_msec;
            const a1 = Math.min(1, Math.max(0.5, 1 - this.age_t(gdb))); // 0.5 is arbitrary, yes.
            const fs = `rgba(64,0,0,${a1})`;
            // nifty trails, arbitrary hard-coded hacked values.
            cx2d.beginPath();
            cx2d.lineWidth = 1;
            const ss = `rgba(255,255,0,${a1})`;
            cx2d.strokeStyle = ss;
            const sxy1 = v2sv_wrapped({x:x1, y:y1}, gdb.world.gameport, gdb.world.bounds0, true);
            cx2d.moveTo(sxy1.x+this.pdim/2, sxy1.y+this.pdim/2);
            cx2d.lineTo(sxy1.x+this.pdim/2 - vx * 10, sxy1.y+this.pdim/2 - vy * 10);
            cx2d.stroke();
            // the particle itself.
            cx2d.fillStyle = fs;
            cx2d.fillRect(sxy1.x, sxy1.y, this.pdim, this.pdim);
            if (debugging_state.is_drawing) {
                cx2d.beginPath();
                cx2d.lineWidth = 1;
                cx2d.strokeStyle = "#00FF0033";
                cx2d.moveTo(sxy1.x, sxy1.y);
                cx2d.lineTo(sxy1.x + vx * 100, sxy1.y + vy * 100);
                cx2d.stroke();
            }
        }
    }
}

function log(...args: any) {
    console.log(...args);
}

function rand_mk(seed: number) {
    return function () {
        seed |= 0;
        seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function nextFrame(/*using global server_db*/) {
    const now = Date.now();
    fps.on_tick();
    // requestAnimationFrame() is running at 30fps for me
    // so don't wait a whole nother round if we're close,
    // hence this heuristic of scaling the threshold by 0.9.
    if (now - last_render_msec >= MSEC_PER_FRAME*0.9) {
        last_render_msec = now;
	tick++;
        render(server_db);
    } 
    window.requestAnimationFrame(nextFrame);
}

function v2sv_wrapped(v: any/*G.V2D*/, gameport: any/*gameport*/, world_bounds: any/*G.V2D*/, wrap: boolean): any/*G.V2D*/ {
    const v2 = wrap ? gameport_wrap_v2d(v, gameport, world_bounds) : v;
    const vs = v2sv(v2, gameport);
    return vs;
}

function v2sr_wrapped(r: any/*G.Rect*/, gameport: any/*gameport*/, world_bounds: any/*G.V2d*/, wrap: boolean): any/*G.Rect*/ {
    const r2 = wrap ? gameport_wrap_rect(r, gameport, world_bounds) : r;
    const rs = v2sr(r2, gameport);
    return rs;
}

function v2sv(wv: any/*G.V2D*/, gameport: any/*gameport*/): any/*G.V2D*/ {
    const gwv = {
        x: wv.x - gameport.world_bounds.lt.x,
        y: wv.y - gameport.world_bounds.lt.y
    };
    // the world_bounds and screen_bounds
    // are at the same scale 1:1, so there
    // is only a translation to do.
    const sv = {
        x: gwv.x + gameport.screen_bounds.lt.x,
        y: gwv.y + gameport.screen_bounds.lt.y
    };
    return sv;
}

function v2sr(r: any/*G.Rect*/, gameport: any/*gameport*/): any/*G.Rect*/ {
    return {
        lt: v2sv(r.lt, gameport),
        size: r.size
    };
}

function gameport_wrap_v2d(v: any/*G.V2D*/, gameport: any/*gameport*/, world_bounds: any/*G.V2D*/): any/*G.V2D*/ {
    const vr = { lt: v, size: { x: 0, y: 0 } };
    const vw2 = gameport_wrap_rect(vr, gameport, world_bounds);
    return vw2.lt;
}

function gameport_wrap_rect(rect: any/*G.Rect*/, gameport: any/*gameport*/, world_bounds: any/*G.V2D*/): any/*G.Rect*/ {
    const gameport_bounds = gameport.world_bounds;
    const l = rect.lt.x;
    const r = l + rect.size.x;

    // it might be overlapping the gameport.
    let x2 = l;

    // else if off the right side of the gameport,
    // wrap it to the left side in case it
    // would be visible in the gameport over there.
    if (l >= gameport_bounds.lt.x + gameport_bounds.size.x) {
        x2 = l - world_bounds.x;
    }

    // else if off the left side of the gameport,
    // wrap it ot the right side in case it
    // would be visible in the gameport over there.
    if (r < gameport_bounds.lt.x) {
        x2 = l + world_bounds.x;
    }

    return {
        lt: { x: x2, y: rect.lt.y },
        size: rect.size
    };
}

function renderSounds(gdb: any) {
    gdb.items.sfx.forEach((sid: string) => {
        const sound = sounds[sid];
        if (!!sound) {
            sound.play();
        }
    });
}

function renderSpriteImage(gdb: any, s: any) {
    const zs: Array<string>|undefined = s.z_back_to_front_ids;
    if (zs != null) {
        zs.forEach(z => renderSpriteImageLayer(gdb, s, z))
    }
    renderSpriteImageLayer(gdb, s, s.resource_id);
}

function renderSpriteImageLayer(gdb: any, s: any, resource_id: string) {
    const gameport = gdb.world.gameport;
    const world_bounds = gdb.world.bounds0;
    if (resource_id != null && s.alpha > 0) {
        const ss = gdb.screen_shake ?? {x:0, y:0};
        const wr = v2sr_wrapped(s, gameport, world_bounds, true);
        // todo: skip if the wr is not on the screen at all.
        try {
            if (s.alpha != 1) {
                cx2d.save();
                cx2d.globalAlpha = s.alpha;
            }
            const img: any = images[resource_id];
            if (img != null) {
                cx2d.drawImage(img,
                    0, 0, img.width, img.height,
                    Math.floor(wr.lt.x + ss.x), Math.floor(wr.lt.y + ss.y),
                    Math.floor(wr.size.x), Math.floor(wr.size.y),
                );
            }
						else {
								//console.error(`no image for ${resource_id}`);
						}
            if (s.alpha != 1) {
                cx2d.restore();
            }
        }
        catch (err) {
            console.error(err);
        }
    }
}

function renderSprite(gdb: any, s: any) {
    renderSpriteImage(gdb, s);
    // match: i do want the drawing on top ie for player's shield_bar.
    renderDrawing(gdb, s.drawing);
    if (s != null && debugging_state.is_drawing) {
        renderRects(gdb,
            [{ rect: s, width: 1, color: DEBUG_IMG_BOX_COLOR }]
        );
    }
    if (s != null && debugging_state.is_annotating) {
        const wr = v2sr_wrapped(s, gdb.world.gameport, gdb.world.bounds0, true);
        const rid = (s.resource_id || "/nil").replace(/.*\//, "");
        cx2d.font = "9px mono";
        cx2d.fillStyle = "white";
        cx2d.fillText(`${s.comment} ${rid}`, wr.lt.x, wr.lt.y+10);
    }
}

function renderPlayer(gdb: any) {
    const p = gdb.items.player;
    if (p != null) {
        renderSprite(gdb, p);
    }
}

function renderPeople(gdb: any) {
    for (const p of Object.values(gdb.items.people)) {
        renderSprite(gdb, p);
    }
}

function renderGems(gdb: any) {
    for (const g of Object.values(gdb.items.gems)) {
        renderSprite(gdb, g);
    }
}

function renderWarpin(gdb: any) {
    for (const w of Object.values(gdb.items.warpin)) {
        renderSprite(gdb, w);
    }
}

function renderEnemies(gdb: any) {
    for (const e of Object.values(gdb.items.enemies)) {
        renderSprite(gdb, e);
    }
}

function renderShields(gdb: any) {
    for (const s of Object.values(gdb.items.shields)) {
        // const show = s.hp
        renderSprite(gdb, s);
    }
}

function renderExplosions(gdb: any) {
    for (const s of Object.values(gdb.items.explosions)) {
        renderSprite(gdb, s);
    }
}

function renderShots(gdb: any) {
    for (const s of Object.values(gdb.items.shots)) {
        renderSprite(gdb, s);
    }
}

function renderFx(gdb: any) {
    for (const x of Object.values(gdb.items.fx)) {
        renderSprite(gdb, x);
    }
}

function renderBg(gdb: any) {
    renderDrawing(gdb, gdb.permanent_bg_drawing);
    for (const s of Object.values(gdb.items.bgFar)) {
        renderSprite(gdb, s);
    }
    for (const s of Object.values(gdb.items.bgNear)) {
        renderSprite(gdb, s);
    }
}

function renderGround(gdb: any) {
    for (const g of Object.values(gdb.items.ground)) {
        renderSprite(gdb, g);
    }
    renderSprite(gdb, gdb.items.base);
}

function renderSky(gdb: any) {
    for (const s of Object.values(gdb.items.sky)) {
        renderSprite(gdb, s);
    }
}

function F2D(n: number): number {
    return Math.round((Number.EPSILON+n)*100)/100;
}

function renderDebug(gdb: any) {
    if (debugging_state.is_drawing) {
        // these are drawn in world coordinates.
        const gameport_bounds = gdb.world.gameport.screen_bounds;
        const mwx = gameport_bounds.lt.x + gameport_bounds.size.x/2;
        const mwy = gameport_bounds.lt.y + gameport_bounds.size.y/2;
        cx2d.fillText(`${F2D(mwx)} ${F2D(mwy)}`, mwx-gameport_bounds.lt.x-40, mwy-gameport_bounds.lt.y-10);
        if (gdb.debug_graphics != null) {
            gdb.debug_graphics.forEach((g:any) => renderDrawing(gdb, g));
        }

        // these are hard-coded in screen coordinates.
        cx2d.font = "12px mono";
        cx2d.fillStyle = "white";
        cx2d.fillText(`ticks ${gdb.tick}`, 300, 10);
        cx2d.fillText(`sim clock ${Math.floor(gdb.sim_now)}`, 300, 30);
        cx2d.fillText(`sim fps ${F2D(gdb.fps)}`, 300, 50);
	// todo: this needs some kind of smoothing, it is often unreadable.
        cx2d.fillText(`client fps ${F2D(game_fps)}`, 300, 70);
        cx2d.fillText(`client fps ${TARGET_FPS} ${game_fps >= TARGET_FPS} ${F2D(Math.abs(game_fps-TARGET_FPS))}`, 300, 90);

        renderLine(4, "#00FF0055", 0, 0, h5canvas.width, h5canvas.height);
        renderLine(4, "#00FF0055", 0, h5canvas.height, h5canvas.width, 0);
    }
}

function renderHud(gdb: any) {
    renderHudDrawing(gdb);
}

function renderHudDrawing(gdb: any) {
    // note: the radar and other HUD items are drawn
    // in screen space, not in game world space.
    const drawing = gdb.hud_drawing;
    // match: server expects client to draw rects first
    // so it can blank out areas of the view for painter's algorithm.
    drawing.rects.forEach((dr: any) => { renderRect(
        dr.is_filled, dr.line_width, dr.color, dr.rect.lt.x, dr.rect.lt.y, dr.rect.size.x, dr.rect.size.y
    ) });
    drawing.lines.forEach((dl: any) => { renderLine(
        dl.line_width, dl.color, dl.p0.x, dl.p0.y, dl.p1.x, dl.p1.y
    ) });
    drawing.ellipses.forEach((de: any) => { renderEllipse(
        de.is_filled, de.line_width, de.color,
        de.bounds.lt.x, de.bounds.lt.y,
        de.bounds.size.x, de.bounds.size.y
    ) });
    drawing.arcs.forEach((da: any) => { renderArc(
        da.is_filled, da.line_width, da.color,
        da.bounds.lt.x, da.bounds.lt.y,
        da.bounds.size.x, da.bounds.size.y,
        da.radians_start, da.radians_end
    ) });
    drawing.texts.forEach((dt: any) => { renderText(
        dt.text, dt.font, dt.fillStyle, dt.lb.x, dt.lb.y
    ) });
    drawing.images.forEach((di: any) => { renderImage(
        di.resource_id, di.rect.lt.x, di.rect.lt.y, di.rect.size.x, di.rect.size.y
    ) });
}

function renderAllFgDrawings(gdb: any) {
    renderDrawing(gdb, gdb.permanent_fg_drawing);
    renderDrawing(gdb, gdb.frame_drawing);
}

function renderDrawing(xdb: any, drawing: any/*Dr.Drawing*/) {
    // match: server expects client to draw rects first.
    if (drawing?.other != null) {
        renderDrawing(xdb, drawing?.other);
    }
    renderRects(xdb, drawing?.rects);
    renderLines(xdb, drawing?.lines);
    renderEllipses(xdb, drawing?.ellipses);
    renderArcs(xdb, drawing?.arcs);
    renderTexts(xdb, drawing?.texts);
    renderImages(xdb, drawing?.images);
}

function renderLines(gdb: any, draw_lines: Array<any/*Dr.DrawLine*/>) {
    if (draw_lines != null) {
        const ss = gdb.screen_shake ?? {x:0, y:0};
        for (const dl of draw_lines) {
            const wrap = dl.wrap ?? true;
            const sp0 = v2sv_wrapped(dl.p0, gdb.world.gameport, gdb.world.bounds0, wrap);
            const sp1 = v2sv_wrapped(dl.p1, gdb.world.gameport, gdb.world.bounds0, wrap);
            renderLine(
                dl.line_width,
                dl.color,
                sp0.x + ss.x, sp0.y + ss.y,
                sp1.x + ss.x, sp1.y + ss.y
            );
        }
    }
}
function renderLine(line_width: any, color: any, x0: any, y0: any, x1: any, y1: any) {
    cx2d.beginPath();
    cx2d.lineWidth = line_width;
    cx2d.strokeStyle = color;
    cx2d.moveTo(x0, y0);
    cx2d.lineTo(x1, y1);
    cx2d.stroke();
}

function renderRects(xdb: any, draw_rects: Array<any/*Dr.DrawRect*/>) {
    if (draw_rects != null) {
        const ss = xdb.screen_shake ?? {x:0, y:0};
        for (const dr of draw_rects) {
            const wrap = dr.wrap ?? true;
            const r = dr.rect;
            const sr = v2sr_wrapped(r, xdb.world.gameport, xdb.world.bounds0, wrap);
            renderRect(dr.is_filled, dr.line_width, dr.color,
                sr.lt.x + ss.x, sr.lt.y + ss.y,
                r.size.x, r.size.y);
        }
    }
}
function renderRect(is_filled: any, line_width: any, color: any, x: any, y: any, w: any, h: any) {
    cx2d.lineWidth = line_width;
    cx2d.strokeStyle = color;
    if (is_filled) {
        cx2d.fillStyle = color;
        cx2d.fillRect(x, y, w, h);
    }
    else {
        cx2d.strokeRect(x, y, w, h);
    }
}

function renderEllipses(xdb: any, draw_ellipses: Array<any/*Dr.DrawEllipse*/>) {
    if (draw_ellipses != null) {
        for (const de of draw_ellipses) {
            // todo: really need to share the geom.ts from server/src.
            const wrap = de.wrap ?? true;
            const r = de.bounds;
            const sr = v2sr_wrapped(r, xdb.world.gameport, xdb.world.bounds0, wrap);
            const ss = xdb.screen_shake ?? {x:0, y:0};
            renderEllipse(de.is_filled, de.line_width, de.color,
                sr.lt.x + ss.x, sr.lt.y + ss.y,
                sr.size.x, sr.size.y);
        }
    }
}
function renderEllipse(is_filled: any, line_width: any, color: any, x: any, y: any, w: any, h: any) {
    renderArc(is_filled, line_width, color, x, y, w, h, 0, 2*Math.PI);
}

function renderArcs(xdb: any, draw_arcs: Array<any/*Dr.DrawArc*/>) {
    if (draw_arcs != null) {
        for (const da of draw_arcs) {
            // todo: really need to share the geom.ts from server/src.
            const wrap = da.wrap ?? true;
            const r = da.bounds;
            const sr = v2sr_wrapped(r, xdb.world.gameport, xdb.world.bounds0, wrap);
            const ss = xdb.screen_shake ?? {x:0, y:0};
            renderArc(da.is_filled, da.line_width, da.color,
                sr.lt.x + ss.x, sr.lt.y + ss.y,
                sr.size.x, sr.size.y,
                da.radians_start, da.radians_end);
        }
    }
}
function renderArc(is_filled: any, line_width: any, color: any, x: any, y: any, w: any, h: any, r0: any, r1: any) {
    const xr = w / 2;
    const yr = h / 2;
    const mx = x + xr;
    const my = y + yr;
    cx2d.lineWidth = line_width;
    cx2d.strokeStyle = color;
    cx2d.beginPath();
    cx2d.ellipse(mx, my, xr, yr, 0, r0, r1);
    if (is_filled) {
        cx2d.fillStyle = color;
        cx2d.fill();
    }
    else {
        cx2d.stroke();
    }
}

function renderTexts(xdb: any, draw_texts: Array<any/*Dr.DrawText*/>) {
    if (draw_texts != null) {
        const ss = xdb.screen_shake ?? {x:0, y:0};
        for (const dt of draw_texts) {
            const wrap = dt.wrap == null ? true : !!dt.wrap;
            const slb = v2sv_wrapped(dt.lb, xdb.world.gameport, xdb.world.bounds0, wrap);
            renderText(dt.text, dt.font, dt.fillStyle,
                slb.x + ss.x, slb.y + ss.y);
        }
    }
}
function renderText(text: any, font: any, fillStyle: any, base_x: any, base_y: any) {
    cx2d.font = font;
    cx2d.fillStyle = fillStyle;
    cx2d.fillText(text, base_x, base_y);
}

function renderImages(xdb: any, draw_images: Array<any/*Dr.DrawImage*/>) {
    if (draw_images != null) {
        const ss = xdb.screen_shake ?? {x:0, y:0};
        for (const di of draw_images) {
            const wrap = di.wrap == null ? true : !!di.wrap;
            const image_located = di.image_located;
            const resource_id = image_located.resource_id;
            const rect = image_located.rect;
            const slt = v2sv_wrapped(rect.lt, xdb.world.gameport, xdb.world.bounds0, wrap);
            renderImage(resource_id, slt.x, slt.y, rect.size.x, rect.size.y);
        }
    }
}
function renderImage(resource_id: string, x: number, y: number, w: number, h: number) {
    const img: any = images[resource_id];
    if (img != null) {
        cx2d.drawImage(img,
            0, 0, img.width, img.height,
            x, y, w, h
        );
    }
		else {
				//console.error(`no image for ${resource_id}`);
		}
}

// todo: this gets weird because the client
// never had a "step", but now it does, so
// how does that relate to the server dt, and
// eventually probably we should pull it out
// separately from "render".
function renderParticles(gdb: any) {
    for (const kv of Object.entries(particles)) {
        const [pid, pgen]:[string,any] = kv;
        pgen.render(gdb, h5canvas);
        if (pgen.age_t(gdb) > 1) {
            delete particles[pid];
        }
    }
}

function render(mdb: any) {
    if (mdb != null) {    
        cx2d.fillStyle = mdb.menu_db?.bg_color || mdb.game_db?.bg_color || BG_COLOR;
        cx2d.fillRect(0, 0, h5canvas.width, h5canvas.height);
        renderPlaying(mdb.game_db);
        renderMenu(mdb.menu_db);
    }
}

function renderMenu(mdb: any) {
    if (mdb == null) { return; }
    renderDrawing(mdb, mdb.frame_drawing);
    renderDebug(mdb);
}

function renderPlaying(gdb: any) {
    if (gdb == null) { return; }

    renderSounds(gdb);

    // painter's algorithm, back-to-front.
    // maintain the z-ordering here as appropriate
    // e.g. shields under other sprites. although
    // such things are subjective, thus subject to change.
    renderBg(gdb);
    renderSky(gdb);
    renderGround(gdb);
    renderShields(gdb);
    renderPlayer(gdb);
    renderPeople(gdb);
    renderGems(gdb);
    renderWarpin(gdb);
    renderEnemies(gdb);
    renderExplosions(gdb);
    renderShots(gdb);
    renderFx(gdb);
    renderParticles(gdb);
    renderAllFgDrawings(gdb);
    // draw the hud last(ish) so it is z-on-top.
    renderHud(gdb);
    renderDebug(gdb);        
}

function onKeyDown(event: any) {
    onKey(event, true);
}

function onKeyUp(event: any) {
    onKey(event, false);
}

function onKey(event: any, is_keydown: boolean) {
    // log("onKey", event.key, is_keydown?"down":"up");
    // todo: i am not sure this is really preventing key repeat cf. space bar shooting.
    if (!event.defaultPrevented && !event.repeat) {
        if (is_keydown) {
            inputs.keys[event.key] = true;
        }
        else {
            delete inputs.keys[event.key];
        }
        const spec: CommandSpec = key2cmd[event.key];
        // log("  key", event.key);
        if (spec != null) {
            const ik = spec.command;
            // log("  ik", ik);
            event.preventDefault();
            inputs.commands[ik] = is_keydown;
            // todo: maybe also keep debugging_state only on the server, don't have it be a long-term client global.
            if (ik == CommandType.debug_toggle_graphics && is_keydown) {
                debugging_state.is_drawing = !debugging_state.is_drawing;
                log("  debugging is_drawing", debugging_state.is_drawing);
            }
            if (ik == CommandType.debug_toggle_annotations && is_keydown) {
                debugging_state.is_annotating = !debugging_state.is_annotating;
                log("  debugging is_annotating", debugging_state.is_annotating);
            }
            if (ik == CommandType.debug_toggle_stepping && is_keydown) {
                debugging_state.is_stepping = !debugging_state.is_stepping;
                log("  debugging is_stepping", debugging_state.is_stepping);
            }
            if (ik == CommandType.debug_step_frame && debugging_state.is_stepping && is_keydown) {
                log("  debug_step_frame");
            }
            sendState();

			// todo: i am confused looking at this now,
			// i should think after the delete we'd have
			// to sendState() again for it to work right?!
            if (spec.is_singular) {
                delete inputs.commands[ik];
                log("  is_singular delete", inputs.commands[ik]);
            }
        }
    }
}

function sendState() {
    try {
        // todo: match/share type with server side.
        // note that the server side is going to have
        // to merge down a collection of these.
        const step = {
            client_id: client_id,
            inputs: inputs,
            debugging_state: debugging_state,
        }
        const json = JSON.stringify(step);
        sendWS(json);
    }
    catch (err) {
        console.error(err);
    }
}

function connectWS(endpoint: string, onMessage?: any, onConnected?: any) {
    if (socket_ws != null) {
        socket_ws.close()
    }
    socket_ws = new WebSocket(endpoint);
    socket_ws.onmessage = ((event: any) => {
        // log("onmessage", event.data); overkill.
        onMessage && onMessage(event);
    });
    socket_ws.onopen = ((event: any) => {
        log("onopen", event);
        onConnected && onConnected(event);
    });
    socket_ws.onclose = () => {
        log("onclose");
    };
    socket_ws.onerror = (event: any) => {
        log("ERROR", event);
    };
}

function sendWS(message: string) {
    if (socket_ws != null) {
        try {
            socket_ws.send(message)
        }
        catch (err) {
        }
    }
}

function closeWS() {
    if (socket_ws != null) {
        socket_ws.close();
        socket_ws = undefined;
    }
}

function applyDB(next_server_db: any) {
    // // just a is_debugging thing: show the first gdb we get.
    // if (next_server_db.tick == 1) {
    //     log("gdb", next_server_db.game_db);
    // }
    
    // the client is mostly dumb and just
    // renders things verbatim from the server db
    // without keeping any long term state on the client...
    // except for expensive/big things that hurt perf too much,
    // so make client-side-things like particle generators.
    server_db = next_server_db;
    applyParticles(server_db.game_db);
}

function applyParticles(gdb: any) {
    if (gdb == null) { return; }
    for (const kv of Object.entries(gdb.items.particles)) {
        const [pid, pspec]:[string,any] = kv;
        if (particles[pid] == null) {
            particles[pid] = new ParticlesEllipseGenerator(
                pspec.count,
                pspec.duration_msec,
                gdb.sim_now,
                pspec.speed,
                pspec.vel,
                pspec.bounds,
                pspec.gravity
            );
        }
    }
}

function base64ToAudioBuffer(base64: string): any {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; ++i) {
        bytes[i] = binary.charCodeAt(i) & 0xFF;
    }
    return bytes.buffer;
}

function loadSound(resource: string, base64: string) {
    // this path is relative to where index.html lives.
    const buffer = base64ToAudioBuffer(base64);
    contextAudio.decodeAudioData(buffer,
        (decoded: any) => {
            sounds[`sounds/${resource}`] = {
                play() {
                    const source = contextAudio.createBufferSource();
                    source.buffer = decoded;
                    source.connect(contextAudio.destination);
                    source.start();
                }
            }
        },
        (error: any) => {
            console.error(error);
        }
    );
}

function loadSounds() {
    log("can play ogg?", (new Audio()).canPlayType("audio/ogg; codecs=vorbis"));
    loadSound("beamdown.ogg", beamdown_sfx_b64);
    loadSound("beamup.ogg", beamup_sfx_b64);
    loadSound("explosion.ogg", explosion_sfx_b64);
    loadSound("gem_collect.ogg", gem_collect_sfx_b64);
    loadSound("player_shoot.ogg", player_shoot_sfx_b64);
}

function loadImage(resource: string) {
    const i = new Image();
    i.onload = () => {
        // log(`OK: resource <${resource}> loaded.`);
        images[`images/${resource}`] = i;
    }
    i.onerror = () => {
        console.error(`ERROR: resource <${resource}> loading failed!`);
    }
    // this path is relative to where index.html lives.
    i.src = `resources/images/${resource}`;
}

function loadImages() {
    // todo: this is really lame and really sucks to maintain!
    // if this at least just walked the files and loaded them all...
    // todo: load the graphics from the server, not locally???
    // or at least share this kind of big spec's code with the server.
    
    ['left', 'right'].forEach(dir => {
        ['a', 'b', 'c'].forEach(anim => {
            loadImage(`player/p1_${anim}_${dir}.png`);
            loadImage(`player/p1_f${anim}_${dir}.png`);
        })
    });

    [1,2,3,4].forEach(anim => {
        loadImage(`ground/base${anim}.png`);
    });
    
    loadImage("enemies/basic1/sph1.png");
    loadImage("enemies/basic1/sph2.png");
    loadImage("enemies/basic1/sph3.png");

    loadImage("enemies/basic2/tt1.png");
    loadImage("enemies/basic2/tt2.png");
    loadImage("enemies/basic2/tt3.png");

    loadImage("enemies/e1/e1.png");
    loadImage("enemies/e11/e11a.png");
    loadImage("enemies/e18/e18.png");

    ["l", "r"].forEach(d => {
        loadImage(`enemies/e15/e15${d}.png`);
        loadImage(`enemies/e16/e16${d}.png`);
        loadImage(`enemies/e17/e17${d}.png`);
        loadImage(`enemies/e17/e17${d}_0.png`);
    });

    ["", "_50", "_20"].forEach(hp => {
        loadImage(`enemies/e8/e8${hp}.png`);
    });
    
    [1,2,3,4,5,6].forEach(anim => {
        loadImage(`enemies/smartbomb/s${anim}.png`);
    });

    [1,2,3].forEach(anim => {
        loadImage(`enemies/e9/e9_${anim}.png`);
        loadImage(`enemies/e9/e9_${anim}_50.png`);
        loadImage(`enemies/e9/e9_${anim}_20.png`);
    });

    [1,2,3,4,5].forEach(anim => {
        loadImage(`enemies/e10s/e10_s${anim}.png`);
        loadImage(`enemies/e10m/e10_m${anim}.png`);
        loadImage(`enemies/e10hm/e10_hm${anim}.png`);
    });

    [1,2,3,4].forEach(anim => {
        loadImage(`enemies/e12/e12l_${anim}.png`)
        loadImage(`enemies/e12/e12r_${anim}.png`)
    });

    [0,1,2].forEach(anim => {
        loadImage(`enemies/e13/e13l_${anim}.png`)
        loadImage(`enemies/e13/e13r_${anim}.png`)
    });

    [1,2,3].forEach(anim => {
        loadImage(`enemies/e20/g${anim}.png`)
    });

    loadImage(`enemies/e21/gg1l.png`)
    loadImage(`enemies/e21/gg1lt.png`)
    loadImage(`enemies/e21/gg1r.png`)
    loadImage(`enemies/e21/gg1rt.png`)

    loadImage(`enemies/e22/hh1.png`)
    loadImage(`enemies/e22/hh2.png`)

    Array.from({length: 10}, (v, i) => i+1).forEach(i =>
        loadImage(`gem/gem${i}.png`)
    );

    [1,2,3,4,5,6,7,8].forEach(anim => {
        loadImage(`warpin/warpin${anim}.png`);
    });
    ['a','b','c','d'].forEach(anim => {
        loadImage(`warpin/warpin_${anim}.png`);
    });

    loadImage("shield/shield1.png");
    loadImage("shield/shield1_top.png");
    loadImage("shield/shield2.png");
    
    loadImage("shots/ball_shot8a.png");
    loadImage("shots/ball_shot8b.png");
    loadImage("shots/enemy_bullet.png");
    loadImage("shots/bullet_shot_r.png");
    loadImage("shots/bullet_shot_l.png");
    loadImage("shots/bullet_shot_2r.png");
    loadImage("shots/bullet_shot_2l.png");
    loadImage("shots/bullet_shot_3r.png");
    loadImage("shots/bullet_shot_3l.png");

    loadImage("clouds/c_big.png");
    loadImage("clouds/c_middle.png");
    loadImage("clouds/c_small.png");
    loadImage("ground/ga.png");
    loadImage("ground/ga_sr.png");
    loadImage("ground/ga_sl.png");
    loadImage("ground/sa.png");
    loadImage("people/standing.png");
    loadImage("people/waving1.png");
    loadImage("people/waving2.png");
    loadImage("people/tp0.png");
    loadImage("people/tp1.png");
    loadImage("people/tp2.png");
    loadImage("people/tp3.png");
    loadImage("people/tp4.png");
    loadImage("people/tp5.png");
    loadImage("people/skull.png");
    loadImage("empty1.png");
    // special case: multi-image-resource.
    loadExplosionA("explosionA");
    loadImage("bg/ma_far.png");
    loadImage("bg/mal_far.png");
    loadImage("bg/mar_far.png");
    loadImage("bg/ma_near.png");
}

// match: todo: share this code with the server.
function loadExplosionA(dir: string) {
    const start_n = 0;
    const end_n = 11;
    const base = "tile";
    for (let n = start_n; n <= end_n; ++n) {
        const tail = String(n).padStart(3, '0') + ".png"
        const file = dir + "/" + base + tail;
        loadImage(file);
    }
}

function onConnectedWS() {
    sendState(); // kickoff!
    window.requestAnimationFrame(nextFrame);
}

function onMessageWS(event: any) {
    try {
        // match: DBSharedState type from server code.
        // todo: extract DBSharedState type into shared file.
        let next_server_db = JSON.parse(event.data);
        applyDB(next_server_db);
    }
    catch (err) {
        console.error(err);
    }
}

function applyCommand(spec: CommandSpec, pressed: boolean) {
	let ik = spec.command;
	inputs.commands[ik] = pressed;
    sendState();

	// todo: see comments on the other instance of this.
    if (spec.is_singular) {
        delete inputs.commands[ik];
    }
}

let gStickUp: boolean = false;
let gStickDown: boolean = false;
let gStickLeft: boolean = false;
let gStickRight: boolean = false;
function JoystickMove(event: any) {
    if (event.verticalValue < -0.5) {
		if (!gStickUp) {
			gStickUp = true;
			applyCommand(UpSpec, true);
		}
    }
    else if (event.verticalValue <= 0) {
		if (gStickUp) {
			gStickUp = false;
			applyCommand(UpSpec, false);
		}
    }

    if (event.verticalValue > 0.5) {
		if (!gStickDown) {
			gStickDown = true;
			applyCommand(DownSpec, true);
		}
    }
	else if (event.verticalValue >= 0) {
		if (gStickDown) {
			gStickDown = false;
			applyCommand(DownSpec, false);
		}
	}

    if (event.horizontalValue < -0.5) {
		if (!gStickLeft) {
			gStickLeft = true;
			applyCommand(LeftSpec, true);
		}
	}
    else if (event.horizontalValue <= 0) {
		if (gStickLeft) {
			gStickLeft = false;
			applyCommand(LeftSpec, false);
		}
    }

    if (event.horizontalValue > 0.5) {
		if (!gStickRight) {
			gStickRight = true;
			applyCommand(RightSpec, true);
		}
    }
    else if (event.horizontalValue >= 0) {
		if (gStickRight) {
			gStickRight = false;
			applyCommand(RightSpec, false);
		}
	}
}

function ButtonChange(event: any, pressed: boolean) {
	applyCommand(FireSpec, pressed);
}

function gamepadHandler(event: any, connecting: boolean) {
	console.log("gamepadHandler", connecting ? 'on' : 'off');
	if (connecting) {
		if ( currentGamepad != null ) {
			currentGamepad.removeEventListener("joystickmove", StandardMapping.Axis.JOYSTICK_LEFT);
			currentGamepad.removeEventListener("buttonpress");
			currentGamepad.removeEventListener("buttonrelease");
		}
		currentGamepad = event.gamepad;
		currentGamepad.addEventListener("joystickmove", (e:any) => JoystickMove(e), StandardMapping.Axis.JOYSTICK_LEFT);
		currentGamepad.addEventListener("buttonpress", (e:any) => ButtonChange(e, true));
		currentGamepad.addEventListener("buttonrelease", (e:any) => ButtonChange(e, false));
	}
}

function init() {
    h5canvas = document.getElementById("canvas");
    // @ts-ignore
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    try { contextAudio = new AudioContext(); } catch(e) { console.error(e); }
    cx2d = h5canvas.getContext("2d");
    loadSounds();
    loadImages();
    // todo: can/should i add it on the h5canvas instead of the windows?
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    Gamepads.start();
    Gamepads.addEventListener("connect", (e:any)=> gamepadHandler(e, true));
    Gamepads.addEventListener("disconnect", (e:any)=> gamepadHandler(e, false));

    connectWS(
        ws_endpoint,
        onMessageWS, // comes in at approximately the server fps.
        onConnectedWS
    );
}

window.onload = init;
