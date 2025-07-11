/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
// todo: figure out the living hell that is 
// packaging for the browser, so that this
// can be split up & also share code w/ the server.
import { track1_sfx_b64 } from '@client/track1.ogg.b64';
import { kcart1_sfx_b64 } from '@client/kcart1.ogg.b64';
import { hiscore_sfx_b64 } from '@client/hiscore.ogg.b64';
import { wiggle_sfx_b64 } from '@client/wiggle.ogg.b64';
import { thrust_sfx_b64 } from '@client/thrust.ogg.b64';
import { begin_sfx_b64 } from '@client/begin.ogg.b64';
import { beamdown_sfx_b64 } from '@client/beamdown.ogg.b64';
import { beamup_sfx_b64 } from '@client/beamup.ogg.b64';
import { explosion_sfx_b64 } from '@client/explosion.ogg.b64';
import { expboom_sfx_b64 } from '@client/expboom.ogg.b64';
import { gem_collect_sfx_b64 } from '@client/gem_collect.ogg.b64';
import { player_shoot0_sfx_b64 } from '@client/player_shoot0.ogg.b64';
import { player_shoot1_sfx_b64 } from '@client/player_shoot1.ogg.b64';
import { player_shoot2_sfx_b64 } from '@client/player_shoot2.ogg.b64';
import { warpin_sfx_b64 } from '@client/warpin.ogg.b64';
import { synthA_sfx_b64 } from '@client/synthA.ogg.b64';
import { synthB_sfx_b64 } from '@client/synthB.ogg.b64';
import { synthC_sfx_b64 } from '@client/synthC.ogg.b64';
import { synthD_sfx_b64 } from '@client/synthD.ogg.b64';
import { synthE_sfx_b64 } from '@client/synthE.ogg.b64';
import { shot1_sfx_b64 } from '@client/shot1.ogg.b64';
import { shot2_sfx_b64 } from '@client/shot2.ogg.b64';
import { smartbomb_sfx_b64 } from '@client/smartbomb.ogg.b64';
import { swarmer_sfx_b64 } from '@client/swarmer.ogg.b64';
import { deffx_sfx_b64 } from '@client/deffx.ogg.b64';
import { Gamepads, StandardMapping } from '@client/gamepads';
import { FPS } from '@server/fps';
import { HighScores } from '@server/high_scores';
import { game_mk } from '@server/game';
import * as K from '@server/konfig';
 
// todo: turn all this into an encapsulating instance.
// todo: use the server types.

function assert(test: boolean, msg: string = "") {
    if (!test) {
	console.error("assertion failed!", msg);
    }
}

// so i can have everything in dark mode on my Windows machine.
// note that this kills Edge fps, but works ok with Firefox, whatevz!!!
const INVERT_COLORS = false;

const STORAGE_KEY = "_sheepgate";

let inputs: {commands: {[k:string]:boolean}, keys: {[k:string]:boolean}} = {
    commands: {}, keys: {}
};
let debugging_state: any = { is_drawing: false, is_stepping: false, is_annotating: false };
let particles: {[k:string]:AbstractParticleGenerator} = {};
let h5canvas: any;
let cx2d: any;
let cxAudio: any;
let server_db_generation: { id: number; db: any; } = { id: 0, db: undefined };
let images: any = {};
// sfx_id resource path - to - { play function } object.
let sounds: any = {};
// sfx_id resource path - to - audio buffer source.
let singletonSounds = new Map<string, any>(); 

const high_scores = new HighScores();
let game_loop = game_mk(high_scores);

let last_render_msec = 0;
let game_fps = 0;
let fps = new FPS((fps) => { game_fps = fps; });
let tick = 0;
let currentGamepad: any;
const BG_COLOR: string = "#111133";
const DEBUG_IMG_BOX_COLOR: string = "rgba(255,0,0,0.5)";
const client_id = Date.now()
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
    click = "click",
    pause = "pause",
    high_score = "high_score",
    fire = "fire",
    up = "up",
    down = "down",
    left = "left",
    right = "right",
    thrust = "thrust",
    debug_toggle_graphics = "debug_toggle_graphics",
    debug_toggle_annotations = "debug_toggle_annotations",
    debug_toggle_stepping = "debug_toggle_stepping",
    debug_step_frame = "debug_step_frame",
    debug_dump_state = "debug_dump_state",
    debug_win_level = "debug_win_level",
    debug_lose_level = "debug_lose_level",
    debug_smite = "debug_smite",
}
// todo: share this (unfortunately) with the server, esp. the "is_singular" part.
// is_singular true means there's no auto-repeat while the key is held down. (wtf?)
const PauseSpec: CommandSpec = { command: CommandType.pause, is_singular: true };
const HighScoreSpec: CommandSpec = { command: CommandType.high_score, is_singular: true };
const FireSpec: CommandSpec = { command: CommandType.fire, is_singular: false };
const UpSpec: CommandSpec = { command: CommandType.up, is_singular: false };
const DownSpec: CommandSpec = { command: CommandType.down, is_singular: false };
const LeftSpec: CommandSpec = { command: CommandType.left, is_singular: false };
const RightSpec: CommandSpec = { command: CommandType.right, is_singular: false };
const ThrustSpec: CommandSpec = { command: CommandType.thrust, is_singular: false };
const key2cmd_default: { [k: string]: CommandSpec } = {
    // standard gameplay commands.
    Escape:     PauseSpec,
    p:          PauseSpec,
    P:          PauseSpec,
    " ":        FireSpec,
    z:          FireSpec,
    Z:          FireSpec,
    Enter:      FireSpec,
    ArrowUp:    UpSpec,
    w:          UpSpec,
    W:          UpSpec,
    k:          UpSpec,
    K:          UpSpec,
    ArrowDown:  DownSpec,
    s:          DownSpec,
    S:          DownSpec,
    j:          DownSpec,
    J:          DownSpec,
    ArrowLeft:  LeftSpec,
    a:          LeftSpec,
    A:          LeftSpec,
    h:          LeftSpec,
    H:          LeftSpec,
    ArrowRight: RightSpec,
    d:          RightSpec,
    D:          RightSpec,
    l:          RightSpec,
    L:          RightSpec,
    Shift:      ThrustSpec,
    // secret debugging stuff.
    ".":        { command: CommandType.debug_step_frame, is_singular: true },
    "!":        { command: CommandType.debug_dump_state, is_singular: true },
    b:          { command: CommandType.debug_toggle_graphics, is_singular: true }, // de"b"ug mnemonic :-(
    n:          { command: CommandType.debug_toggle_annotations, is_singular: true },
    "/":        { command: CommandType.debug_toggle_stepping, is_singular: true },
    "^":        { command: CommandType.debug_win_level, is_singular: true },
    "&":        { command: CommandType.debug_lose_level, is_singular: true },
    "*":        { command: CommandType.debug_smite, is_singular: true },
};
const key2cmd_hotrod: { [k: string]: CommandSpec } = {
    Escape:     PauseSpec,
    p:          PauseSpec,
    P:          PauseSpec,
    // 1P, 2P buttons:
    1: FireSpec,
    2: FireSpec,
    // side buttons.
    3: FireSpec,
    4: FireSpec,
    // left joystick:
    ArrowUp:    UpSpec,
    ArrowDown:  DownSpec,
    ArrowLeft:  LeftSpec,
    ArrowRight: RightSpec,
    // right joystick:
    r: UpSpec,
    R: UpSpec,
    d: LeftSpec,
    D: LeftSpec,
    g: RightSpec,
    G: RightSpec,
    f: DownSpec,
    F: DownSpec,
    // left buttons:
    Control: FireSpec,
    Alt: FireSpec,
    " ": FireSpec,
    c: FireSpec,
    C: FireSpec,
    Shift: FireSpec,
    z: FireSpec,
    Z: FireSpec,
    x: FireSpec,
    X: FireSpec,
    // right buttons:
    a: FireSpec,
    A: FireSpec,
    s: FireSpec,
    S: FireSpec,
    q: FireSpec,
    Q: FireSpec,
    w: FireSpec,
    W: FireSpec,
    e: FireSpec,
    E: FireSpec,
    "[": FireSpec,
    "]": FireSpec,
    "{": FireSpec,
    "}": FireSpec,
    ".":        { command: CommandType.debug_step_frame, is_singular: true },
    "!":        { command: CommandType.debug_dump_state, is_singular: true },
    b:          { command: CommandType.debug_toggle_graphics, is_singular: true }, // de"b"ug mnemonic :-(
    n:          { command: CommandType.debug_toggle_annotations, is_singular: true },
    "/":        { command: CommandType.debug_toggle_stepping, is_singular: true },
    "^":        { command: CommandType.debug_win_level, is_singular: true },
    "&":        { command: CommandType.debug_lose_level, is_singular: true },
    "*":        { command: CommandType.debug_smite, is_singular: true },
}
const key2cmd = key2cmd_default;

abstract class AbstractParticleGenerator {
    // "o" means "offset" because we're keeping the particles
    // as just a long array-of-structs that is nothing but floats.
    // (todo: yes there's maybe still a bug where the generator might
    // live longer than it should and animates a 2nd time.)
    ox = 0;
    oy = 1;
    ovx = 2;
    ovy = 3;
    osize = 4;
    ostep = 5; // four floats per particle: ox, oy, ovx, ovy, size.
    particles: Float32Array;

    constructor(public count: number, public duration_msec: number, public start_msec: number, public speed: number, public bounds: any/*G.Rect*/, public xyround: number|undefined, particles_mk: (self: AbstractParticleGenerator) => void) {
        this.particles = new Float32Array(this.count * this.ostep);
	particles_mk(this);
    }
    age_t(gdb: any): number {
        const elapsed_msec = gdb.sim_now - this.start_msec;
        const t = elapsed_msec / this.duration_msec
        return t;
    }
    // note: this is step() and render() together in one.
    render(gdb: any, h5canvas: any) {
        const elapsed_msec = gdb.sim_now - this.start_msec;
        const v = Math.min(1, Math.max(0.2, 1 - this.age_t(gdb))); // 0.1 is arbitrary, yes.
	const fs = "rgb(" + (255*v).toString() + "," + (128*v).toString() + ",0)";
        for (let i = 0; i < this.count * this.ostep; i += this.ostep) {
            const x0 = this.particles[i + this.ox];
            const y0 = this.particles[i + this.oy];
            const vx = this.particles[i + this.ovx];
            const vy = this.particles[i + this.ovy];
	    const size = this.particles[i + this.osize];
            let x1 = x0 + vx * elapsed_msec;
            let y1 = y0 + vy * elapsed_msec;
	    if (this.xyround != null) {
		x1 = Math.floor(x1/this.xyround)*this.xyround;
		y1 = Math.floor(y1/this.xyround)*this.xyround
	    }
            const sxy = v2sv_wrapped({x:x1, y:y1}, gdb.world.gameport, gdb.world.bounds0, true);
            // nifty trails, arbitrary hard-coded hacked values.
	    const dx = (x1 - x0) * 5;
	    const dy = (y1 - y0) * 5;
            cx2d.beginPath();
            cx2d.moveTo(sxy.x+size/2, sxy.y+size/2);
            cx2d.moveTo(sxy.x+size/2+dx, sxy.y+size/2+dy);
            cx2d.lineWidth = Math.min(3, Math.max(1, size/4));
            cx2d.strokeStyle = "#AA0F00FF";
            cx2d.stroke();
            // the particle itself.
            cx2d.fillStyle = fs;
            cx2d.fillRect(sxy.x, sxy.y, size, size);
        }
    }
}

class ParticlesEllipseGenerator extends AbstractParticleGenerator {
    constructor(public count: number, public duration_msec: number, public start_msec: number, public speed: number, public bounds: any/*G.Rect*/, public xyround: number|undefined) {
	super(count, duration_msec, start_msec, speed, bounds, xyround,
	      (self) => {
		  const mx = bounds.lt.x + bounds.size.x/2;
		  const my = bounds.lt.y + bounds.size.y/2;
		  const rx = bounds.size.x/2;
		  const ry = bounds.size.y/2;
		  for (let i = 0; i < self.particles.length; i += self.ostep) {
		      // todo: shared libs with server so we can have the random lib, geom lib, etc.
		      // todo: self isn't generating "fair" particles so the explosions look a little weird.
		      const radians = Math.random() * Math.PI * 2;
		      const ix = mx + rx * Math.cos(radians);
		      const iy = my + ry * Math.sin(radians);
		      self.particles[i + self.ox] = ix;
		      self.particles[i + self.oy] = iy;
		      const ivx = ix - mx;
		      const ivy = iy - my;
		      const d = Math.sqrt(ivx * ivx + ivy * ivy);
		      self.particles[i + self.ovx] = ivx / d * speed * (Math.random() + 0.5);
		      self.particles[i + self.ovy] = ivy / d * speed * (Math.random() + 0.5);
		      self.particles[i + self.osize] = 2;
		  }
	      });
    }
}

// these should only use -1, 0, 1.
const P8 = [
    [-1, -1], [0, -1],  [1, -1],
    [-1, 0],  /*blank*/ [1, 0],
    [-1, 1],  [0, 1],   [1, 1]
];

// trying to still make it biased in favor or horizontalness.
class ParticlesEightGenerator extends AbstractParticleGenerator {
    constructor(public count: number, public duration_msec: number, public start_msec: number, public speed: number, public bounds: any/*G.Rect*/, public xyround: number|undefined) {
	super(count, duration_msec, start_msec, speed, bounds, xyround,
	      (self) => {
		  const mx = bounds.lt.x + bounds.size.x/2;
		  const my = bounds.lt.y + bounds.size.y/2;
		  const rx = bounds.size.x/2;
		  const ry = bounds.size.y/2;
		  let spd = speed;
		  for (let i = 0; i < self.particles.length; i += self.ostep) {
		      // todo: shared libs with server so we can have the random lib, geom lib, etc.
		      const pi = Math.floor((i/self.ostep)%8);
		      // make 'layers' every 8 particles.
		      if (i > 0 && pi === 0) {
			  spd /= (i/(self.ostep*8))+1;
		      }
		      if (P8[pi] != undefined) {
			  const [x, y] = P8[pi];
			  assert(x != undefined, "x");
			  assert(y != undefined, "y");
			  const ix = mx + x * rx;
			  const iy = my + y * ry;
			  self.particles[i + self.ox] = ix;
			  self.particles[i + self.oy] = iy;
			  const ivx = ix - mx;
			  const ivy = iy - my;
			  const ySlower = y != 0 ? 0.4 : 1; // squashingish.
			  const d = Math.sqrt(ivx * ivx + ivy * ivy);
			  self.particles[i + self.ovx] = ivx/d * spd;
			  self.particles[i + self.ovy] = ivy/d * spd*ySlower;
			  self.particles[i + self.osize] = 3;
		      }
		  }
	      });
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
    // requestAnimationFrame() is running at 60 fps for me
    // so don't wait a whole nother round if we're close,
    // hence this heuristic of scaling the threshold by 0.9.
    if (now - last_render_msec >= K.FRAME_MSEC_DT * 0.9) {
        last_render_msec = now;
	tick++; // just to be 1-based in render().
	fps.on_tick();
	game_loop.step();
	const next_server_db = game_loop.get_db();
	applyDB(next_server_db);
        render(server_db_generation.db);
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

function renderSounds(db: any) {
    db.sfx?.forEach((sfx: any) => {
        const sound = sounds[sfx.sfx_id];
        if (sound != null) {
            sound.play(sfx);
        }
	else {
	    console.error("!! no resource for", sfx.sfx_id);
	}
    });
    // mutation is evil but we have to avoid
    // playing sounds more than once if there are
    // multiple client frames of renderSounds()
    // between server db updates.
    db.sfx = [];
}

function renderSpriteImage(gdb: any, s: any, xyround?: number) {
    const zs: Array<string>|undefined = s.z_back_to_front_ids;
    if (zs != null) {
        zs.forEach(z => renderSpriteImageLayer(gdb, s, z, xyround))
    }
    renderSpriteImageLayer(gdb, s, s.resource_id, xyround);
}

function renderSpriteImageLayer(gdb: any, s: any, resource_id: string, xyround?: number) {
    const gameport = gdb.world.gameport;
    const world_bounds = gdb.world.bounds0;
    if (resource_id != null && s.alpha > 0) {
        const ss = gdb.screen_shake ?? {x:0, y:0};
	// allow the rendering position to be different than the physics position.
	if (s.draw_lt != undefined) {
	    s = { ...s, lt: s.draw_lt };
	}
        const wr = v2sr_wrapped(s, gameport, world_bounds, true);
        // todo: skip if the wr is not on the screen at all.
        try {
            if (s.alpha != 1) {
                cx2d.save();
                cx2d.globalAlpha = s.alpha;
            }
            const img: any = images[resource_id];
            if (img != null) {
		let x = Math.floor(wr.lt.x + ss.x);
		let y = Math.floor(wr.lt.y + ss.y);
		if (xyround != null) {
		    x = Math.floor(x/xyround)*xyround;
		    y = Math.floor(y/xyround)*xyround;
		}
                cx2d.drawImage(
		    img,
		    0, 0, img.width, img.height,
		    x, y,
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

function renderSprite(gdb: any, s: any, xyround?: number) {
    if (s.alpha > Number.MIN_VALUE) { // match: server
	renderSpriteImage(gdb, s, xyround);
	// match: i do want the drawing on top ie for player's shield_bar.
	renderDrawing(gdb, s.drawing); // todo: xyround. ugh.
	if (s != null && debugging_state.is_drawing) {
            renderRects(
		gdb,
		[{ rect: s, width: 1, color: DEBUG_IMG_BOX_COLOR }]
	    );
	}
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
        renderSprite(gdb, p, gdb.xyround);
    }
    // note: player shadow drawn later to be on z-top.
}

function renderPlayerShadow(gdb: any) {
    const s = gdb.items.player_shadow;
    if (s != null) {
	renderSprite(gdb, s, gdb.xyround);
    }
}

function renderPeople(gdb: any) {
    for (const p of Object.values(gdb.items.people)) {
        renderSprite(gdb, p, gdb.xyround);
    }
}

function renderGems(gdb: any) {
    for (const g of Object.values(gdb.items.gems)) {
        renderSprite(gdb, g, gdb.xyround);
    }
}

function renderWarpin(gdb: any) {
    for (const w of Object.values(gdb.items.warpin)) {
        renderSprite(gdb, w, gdb.xyround);
    }
}

function renderEnemies(gdb: any) {
    for (const e of Object.values(gdb.items.enemies)) {
        renderSprite(gdb, e, gdb.xyround);
    }
}

function renderMunchies(gdb: any) {
    for (const m of Object.values(gdb.items.munchies)) {
        renderSprite(gdb, m, gdb.xyround);
    }
}

function renderShields(gdb: any) {
    for (const s of Object.values(gdb.items.shields)) {
        renderSprite(gdb, s, gdb.xyround);
    }
}

function renderExplosions(gdb: any) {
    for (const s of Object.values(gdb.items.explosions)) {
        renderSprite(gdb, s, gdb.xyround);
    }
    for (const s of Object.values(gdb.items.player_explosions)) {
        renderSprite(gdb, s, gdb.xyround);
    }
}

function renderShots(gdb: any) {
    for (const s of Object.values(gdb.items.shots)) {
        renderSprite(gdb, s, gdb.xyround);
    }
}

function renderFx(gdb: any) {
    for (const x of Object.values(gdb.items.fx)) {
        renderSprite(gdb, x, gdb.xyround);
    }
}

function renderBg(gdb: any) {
    renderDrawing(gdb, gdb.permanent_bg_drawing);
    for (const s of Object.values(gdb.items.bgFar)) {
        renderSprite(gdb, s, gdb.xyround);
    }
    for (const s of Object.values(gdb.items.bgNear)) {
        renderSprite(gdb, s, gdb.xyround);
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
        renderSprite(gdb, s, gdb.xyround);
    }
}

function F2D(n: number): number {
    return Math.round((Number.EPSILON+n)*100)/100;
}

function renderDebug(db: any) { // either menu or game db.
    if (debugging_state.is_drawing) {
        // these are drawn in world coordinates.
        const gameport_bounds = db.world.gameport.screen_bounds;
        const mwx = gameport_bounds.lt.x + gameport_bounds.size.x/2;
        const mwy = gameport_bounds.lt.y + gameport_bounds.size.y/2;
        cx2d.fillText(`${F2D(mwx)} ${F2D(mwy)}`, mwx-gameport_bounds.lt.x-40, mwy-gameport_bounds.lt.y-10);
        if (db.debug_graphics != null) {
            db.debug_graphics.forEach((g:any) => renderDrawing(db, g));
        }

        // these are hard-coded in screen coordinates.
        cx2d.font = "12px mono";
        cx2d.fillStyle = "white";
        cx2d.fillText(`ticks ${db.tick}`, 300, 10);
        cx2d.fillText(`sim clock ${Math.floor(db.sim_now)}`, 300, 30);
        cx2d.fillText(`sim fps ${F2D(db.fps)}`, 300, 50);
	// todo: this needs some kind of smoothing, it is often unreadable.
        cx2d.fillText(`client fps ${F2D(game_fps)}`, 300, 70);
        cx2d.fillText(`client fps ${K.FRAME_MSEC_DT} ${game_fps >= K.FRAME_MSEC_DT} ${F2D(Math.abs(game_fps-K.FRAME_MSEC_DT))}`, 300, 90);

        renderLine(4, "#00FF0055", 0, 0, h5canvas.width, h5canvas.height);
        renderLine(4, "#00FF0055", 0, h5canvas.height, h5canvas.width, 0);
    }
}

function renderHud(gdb: any) {
    renderHudDrawing(gdb);
}

function renderHudDrawing(gdb: any) {
    // note / match: the radar and other HUD items are drawn
    // in screen space, not in game world space.
    // so "wrap" is always ignored. :-\
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
    drawing.texts.forEach((dt: any) => {
	renderText(
            dt.text, dt.font, dt.fillStyle, dt.lb.x, dt.lb.y
	)
    });
    drawing.images.forEach((di: any) => {
	var spec = di.image_located;
	renderImage(
	    spec.resource_id,
	    spec.rect.lt.x, spec.rect.lt.y,
	    spec.rect.size.x, spec.rect.size.y
	);
    });
}

function renderAllFgDrawings(gdb: any) {
    renderDrawing(gdb, gdb.permanent_fg_drawing);
    renderDrawing(gdb, gdb.frame_drawing);
}

function renderDrawing(xdb: any, drawing: any/*Dr.Drawing*/) {
    if (drawing == null) {
	return;
    }
    if (drawing?.other != null) {
        renderDrawing(xdb, drawing?.other);
    }
    // todo: probably each and every individual entry should support a z value.
    // match: server expects client to draw rect first.
    renderRects(xdb, drawing?.rects);
    renderLines(xdb, drawing?.lines);
    renderEllipses(xdb, drawing?.ellipses);
    renderArcs(xdb, drawing?.arcs);
    renderImages(xdb, drawing?.images);
    renderTexts(xdb, drawing?.texts);
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
    cx2d.strokeStyle = color.hex;
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
    cx2d.strokeStyle = color.hex;
    if (is_filled) {
        cx2d.fillStyle = color.hex;
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
    cx2d.strokeStyle = color.hex;
    cx2d.beginPath();
    cx2d.ellipse(mx, my, xr, yr, 0, r0, r1);
    if (is_filled) {
        cx2d.fillStyle = color.hex;
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
            renderText(dt.text, dt.font, dt.fillStyle, slb.x + ss.x, slb.y + ss.y);
        }
    }
}
function renderText(text: any, font: any, fillStyle: any, base_x: any, base_y: any) {
    cx2d.font = font;
    cx2d.fillStyle = fillStyle.hex;
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
	if (pgen != null) {
            pgen.render(gdb, h5canvas);
            if (pgen.age_t(gdb) > 1) {
		delete particles[pid];
            }
	}
	else {
	    console.error("missing pgen for", pid);
	}
    }
}

function render(db: any) {
    if (db != null) {    
        cx2d.fillStyle = db.bg_color?.hex ?? BG_COLOR;
        cx2d.fillRect(0, 0, h5canvas.width, h5canvas.height);
	// painter's algorith, menus should render on top.
	// note: bifurcating on the type of db here.
	if (db.kind === "Game") {
            renderPlaying(db);
	}
	else if (db.kind === "Menu") {
	    renderMenu(db);
	}
	else {
	    assert(false, `unsupported db kind '${db.kind}'`);
	}
    }
}

function renderMenu(mdb: any) {
    if (mdb != null) {
	renderSounds(mdb);
	renderDrawing(mdb, mdb.frame_drawing);
	renderDebug(mdb);
	updateLocalStorage(mdb);
    }
}

function updateLocalStorage(mdb: any) {
    const json = mdb.local_storage_json;
    if (json != null && localStorage != undefined) {
	log("updateLocalStorage", STORAGE_KEY, json);
	localStorage.setItem(STORAGE_KEY, json);
    }
}

function renderPlaying(gdb: any) {
    if (gdb == null) { return; }
    applyParticles(gdb);
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
    renderMunchies(gdb);
    renderExplosions(gdb);
    renderShots(gdb);
    renderFx(gdb);
    renderParticles(gdb);
    renderAllFgDrawings(gdb);
    renderPlayerShadow(gdb);
    // draw the hud last(ish) so it is z-on-top.
    renderHud(gdb);
    renderDebug(gdb);
}

function onClick(event: any) {
    inputs.commands[CommandType.click] = true;
    sendState();
    delete inputs.commands[CommandType.click];
}

function onKeyDown(event: any) {
    onKey(event, true);
}

function onKeyUp(event: any) {
    onKey(event, false);
}

function onKey(event: any, is_keydown: boolean) {
    // todo: i am not sure this is really preventing key repeat cf. space bar shooting.
    if (!event.defaultPrevented && !event.repeat) {
        if (is_keydown) {
            inputs.keys[event.key] = true;
        }
        else {
            delete inputs.keys[event.key];
        }
        const spec: CommandSpec = key2cmd[event.key];
        if (spec != null) {
            const ik = spec.command;
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
	    // user has to re-press the key to get it to happen again.
            if (spec.is_singular) {
		delete inputs.commands[ik];
            }
	}
	else {
	    // always send keys, even if no commands happened.
	    sendState();
	}
    }
}

function sendState(storage_json?: string | undefined) {
    try {
        // todo: match/share type with server side.
        // note that the server side is going to have
        // to merge down a collection of these.
        const step = {
            client_id: client_id,
            inputs: inputs,
            debugging_state: debugging_state,
        }
	if (storage_json != undefined) {
	    // @ts-expect-error syntaxhell
	    step["storage_json"] = storage_json;
	}
	game_loop.merge_client_db(step);
    }
    catch (err) {
        console.error(err);
    }
}

function applyDB(next_server_db: any) {
    // // just a is_debugging thing: show the first gdb we get.
    // if (next_server_db.tick == 1) {
    //     log("gdb", next_server_db);
    // }
    
    // the client is mostly dumb and just
    // renders things verbatim from the server db
    // without keeping any long term state on the client...
    // except for expensive/big things that hurt perf too much,
    // so make client-side-things like particle generators.

    // note that there is a race condition where getting more
    // than 1 server update between client render events
    // can lose messages from anything but the last db.
    // at the moment we special case the sfx because of this.
    // note that there is also the opposite side of the race,
    // where we have more than one render between server updates?!
    // sfx vs. singleton sounds: who starts the sound? who stops it?

    // * # of server db updates >= # of client renders:
    //	+ retain the sfx until they are played by a render().
    //  (that is what is happening here below.)
    //  + gc singleton sfx but only if it reall is playing.
    //  ? how do we know ?

    // * # of client renders >= # of server db updates:
    //	+ render() will play the sfx.
    //  + render() has to account for 'singleton' sfx; start if new.
 
    // i'm pretty sure a null would really be an error end to end.
    assert(next_server_db != null, "next_server_db");
    if (next_server_db != null) {
	let server_db = server_db_generation.db;
	const prevSfx = server_db && server_db.sfx;

	server_db_generation = {
	    id: server_db_generation.id++,
	    db: next_server_db
	};
	server_db = server_db_generation.db;

	// keep accumulating the sfx until a render() happens
	// which will play, then reset the local db's sfx array
	if ((prevSfx?.length ?? 0) > 0 && server_db != null) {
    	    server_db.sfx = server_db.sfx ?? [];
    	    server_db.sfx.push(...prevSfx);
	}

	// todo: determine which ones are no longer needed by the server_db.
	// unfortunately the server_db sounds are not a map, nor are they split by singletonness.
	const nextSingletonSounds = new Map<string, any>(); 
	if (server_db != null) {
	    server_db.sfx.forEach((sfx: any) => {
		const sound = singletonSounds.get(sfx.sfx_id);
		if (sound != null) {
		    nextSingletonSounds.set(sfx.sfx_id, sound);
		    singletonSounds.delete(sfx.sfx_id);
		}
	    });
	}
	singletonSounds.forEach((sound) => {
	    sound.stop()
	});
	singletonSounds = nextSingletonSounds;
    }
}

// once particles are created, they live outside the server_db updates.
function applyParticles(gdb: any) {
    if (gdb == null) { return; }
    for (const kv of Object.entries(gdb.items.particles)) {
        const [pid, pspec]:[string,any] = kv;
        if (particles[pid] == null) {
	    if (pspec.isEightGrid) {
		particles[pid] = new ParticlesEightGenerator(
                    pspec.count,
                    pspec.duration_msec,
                    gdb.sim_now,
                    pspec.speed,
                    pspec.bounds,
		    gdb.xyround
		);
	    }
	    else {
		particles[pid] = new ParticlesEllipseGenerator(
                    pspec.count,
                    pspec.duration_msec,
                    gdb.sim_now,
                    pspec.speed,
                    pspec.bounds,
		    gdb.xyround
		);
	    }
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

// the 'singleton' sfx code is kind of a hell; race conditions; it is split up across functions.
// 0) there could be more than one request for a singleton in a single db.
// (locally we only need one copy, so no arrays needed.)
// 1) don't stack up singleton sounds.
// 2) stop singleton sounds if they are no longer in the server_db in gcSounds().
// 3) singletons have to be continuous i.e. loop in play().
// 4) generationally keep singeltons that are still in demand.
// 5) have to consider the "carry-over" aging case vs. the "was not already playing" case.
// 6) oh and it is yet more complicated, because races between server db update & client frame render.
function logSoundState(msg: string) {
    const ss = Array.from(singletonSounds.keys());
    if (ss.length > 0) { log(msg, "ss", ss); }
}

function loadSound(resource: string, base64: string) {
    // i guess this path is relative to where index.html lives.
    const sfx_id = `sounds/${resource}`;
    const buffer = base64ToAudioBuffer(base64);
    cxAudio.decodeAudioData(
	buffer,
	(decoded: any) => {
	    sounds[sfx_id] = {
		play: (sfx: { sfx_id: string, gain?: number, playback_rate?: number, singleton?: boolean }) => {
		    if (!!sfx.singleton && singletonSounds.has(sfx.sfx_id)) {
			return;
		    }
		    const gainNode = cxAudio.createGain();
		    gainNode.gain.value = sfx.gain ?? 1;
		    gainNode.connect(cxAudio.destination);
		    const sourceNode = cxAudio.createBufferSource();
		    sourceNode.buffer = decoded;
		    sourceNode.connect(gainNode);
		    sourceNode.loop = !!sfx.singleton;
		    sourceNode.playbackRate.value = sfx.playback_rate ?? 1;
		    sourceNode.start();
		    // the sound was not already playing so register the new sfx_id.
		    if (!!sfx.singleton && !singletonSounds.has(sfx_id)) {
			singletonSounds.set(sfx_id, sourceNode);
		    }
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
    loadSound("track1.ogg", track1_sfx_b64);
    loadSound("kcart1.ogg", kcart1_sfx_b64);
    loadSound("hiscore.ogg", hiscore_sfx_b64);
    loadSound("wiggle.ogg", wiggle_sfx_b64);
    loadSound("thrust.ogg", thrust_sfx_b64);
    loadSound("begin.ogg", begin_sfx_b64);
    loadSound("beamdown.ogg", beamdown_sfx_b64);
    loadSound("beamup.ogg", beamup_sfx_b64);
    loadSound("explosion.ogg", explosion_sfx_b64);
    loadSound("expboom.ogg", expboom_sfx_b64);
    loadSound("gem_collect.ogg", gem_collect_sfx_b64);
    loadSound("player_shoot0.ogg", player_shoot0_sfx_b64);
    loadSound("player_shoot1.ogg", player_shoot1_sfx_b64);
    loadSound("player_shoot2.ogg", player_shoot2_sfx_b64);
    loadSound("warpin.ogg", warpin_sfx_b64);
    loadSound("synthA.ogg", synthA_sfx_b64);
    loadSound("synthB.ogg", synthB_sfx_b64);
    loadSound("synthC.ogg", synthC_sfx_b64);
    loadSound("synthD.ogg", synthD_sfx_b64);
    loadSound("synthE.ogg", synthE_sfx_b64);
    loadSound("shot1.ogg", shot1_sfx_b64);
    loadSound("shot2.ogg", shot2_sfx_b64);
    loadSound("smartbomb.ogg", smartbomb_sfx_b64);
    loadSound("swarmer.ogg", swarmer_sfx_b64);
    loadSound("deffx.ogg", deffx_sfx_b64);
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
    i.src = `OLD/client/resources/images/${resource}`;
}

function loadImages() {
    // todo: this is really lame and really sucks to maintain!
    // if this at least just walked the files and loaded them all...
    // todo: load the graphics from the server, not locally???
    // or at least share this kind of big spec's code with the server.
    
    loadImage("sgbg.png");
    loadImage("attract.png");
    loadImage("qr.png");

    ['left', 'right'].forEach(dir => {
        ['a', 'b', 'c'].forEach(anim => {
            loadImage(`player/p1_${anim}_${dir}.png`);
            loadImage(`player/p1_t${anim}_${dir}.png`);
        })
        loadImage(`player/p1_s_${dir}.png`);
    });
    ['L', 'R'].forEach(dir => {
	loadImage(`player/cow${dir}.png`);
	loadImage(`player/cow${dir}T1.png`);
	loadImage(`player/cow${dir}T2.png`);
    });
    loadImage("player/cbml.png");
    loadImage("player/cbmlt.png");
    loadImage("player/cbmr.png");
    loadImage("player/cbmrt.png");
    loadImage("player/zxL1.png");
    loadImage("player/zxR1.png");
    loadImage("player/zxL1T.png");
    loadImage("player/zxR1T.png");

    [1,2,3,4].forEach(anim => {
        loadImage(`ground/base${anim}.png`);
        loadImage(`ground/base_cbm_${anim}.png`);
        loadImage(`ground/base_zx_${anim}.png`);
    });

    loadImage("enemies/munchies/mr1.png");
    loadImage("enemies/munchies/mr2.png");
    loadImage("enemies/munchies/ml1.png");
    loadImage("enemies/munchies/ml2.png");

    [...Array(4).keys()].forEach(n => {
	loadImage(`enemies/pods/sprite_${n}.png`);
    });
    [...Array(8).keys()].forEach(n => {
	loadImage(`enemies/swarmers/sprite_2${n}.png`);
    });
    
    [1,2,3].forEach(anim => {
	loadImage(`enemies/basic1/sph${anim}.png`);
    });

    [1,2,3].forEach(anim => {
	loadImage(`enemies/basic2/tt${anim}.png`);
    });

    [1,2,3].forEach(anim => {
	loadImage(`enemies/basic3/gh${anim}.png`);
    });

    [1,2,3].forEach(anim => {
	loadImage(`enemies/basic3/gh${anim}.png`);
    });

    [1,2,3,4].forEach(anim => {
	loadImage(`enemies/basic4/eb4${anim}.png`);
    });

    [1,2,3,4].forEach(anim => {
	["l", "r"].forEach(d => {
	    loadImage(`enemies/basic5/eb5${d}${anim}.png`);
	});
    });

    [1,2,3].forEach(anim => {
	loadImage(`enemies/basic6/eb6${anim}.png`);
    });

    [1,2,3,4,5].forEach(anim => {
	loadImage(`enemies/basic7/eb${anim}.png`);
    });

    loadImage(`enemies/basic8/defl.png`);
    loadImage(`enemies/basic8/deflt1.png`);
    loadImage(`enemies/basic8/deflt2.png`);
    loadImage(`enemies/basic8/defr.png`);
    loadImage(`enemies/basic8/defrt1.png`);
    loadImage(`enemies/basic8/defrt2.png`);

    loadImage("enemies/e18/e18l.png");
    loadImage("enemies/e18/e18r.png");

    loadImage("enemies/e11/e11a.png");
    loadImage("enemies/e11/e11b.png");
    loadImage("enemies/e11/e11c.png");

    ["l", "r"].forEach(d => {
        loadImage(`enemies/e15/e15${d}.png`);
        loadImage(`enemies/e16/e16${d}.png`);
    });

    loadImage(`enemies/e17/e17l.png`);
    loadImage(`enemies/e17/e17l_0.png`);
    loadImage(`enemies/e17/e17l_1.png`);
    loadImage(`enemies/e17/e17r.png`);
    loadImage(`enemies/e17/e17r_0.png`);
    loadImage(`enemies/e17/e17r_1.png`);

    ["", "_50", "_20"].forEach(hp => {
        loadImage(`enemies/e8/e8${hp}.png`);
    });
    
    [1,2,3,4,5,6].forEach(anim => {
        loadImage(`enemies/smartbomb/s${anim}.png`);
    });

    [1,2,3].forEach(anim => {
        loadImage(`enemies/e9/e9_${anim}.png`);
    });

    [1,2,3,4,5].forEach(anim => {
        loadImage(`enemies/e10s/e10_s${anim}.png`);
        loadImage(`enemies/e10hm/e10_hm${anim}.png`);
    });

    [...Array(8).keys()].forEach(n => {
        loadImage(`enemies/e10m/e10_m${n+1}.png`);
    });

    [1,2,3,4].forEach(anim => {
        loadImage(`enemies/e12/e12l_${anim}.png`);
        loadImage(`enemies/e12/e12r_${anim}.png`);
    });

    [0,1,2].forEach(anim => {
        loadImage(`enemies/e13/e13l_${anim}.png`);
        loadImage(`enemies/e13/e13r_${anim}.png`);
    });

    [1,2,3].forEach(anim => {
        loadImage(`enemies/e20/g${anim}.png`);
    });

    loadImage(`enemies/e21/gg1l.png`);
    loadImage(`enemies/e21/gg1lt.png`);
    loadImage(`enemies/e21/gg1r.png`);
    loadImage(`enemies/e21/gg1rt.png`);

    loadImage(`enemies/e22/hh1.png`);
    loadImage(`enemies/e22/hh2.png`);

    loadImage(`enemies/e23/g387l.png`);
    loadImage(`enemies/e23/g387r.png`);

    loadImage(`enemies/e24/e24l.png`);
    loadImage(`enemies/e24/e24r.png`);

    [1,2,3].forEach(anim => {
	loadImage(`enemies/e25/e25${anim}.png`);
    });

    loadImage(`enemies/e26/e26l.png`);
    loadImage(`enemies/e26/e26r.png`);
    loadImage(`enemies/e26/e26t1l.png`);
    loadImage(`enemies/e26/e26t1r.png`);
    loadImage(`enemies/e26/e26t2l.png`);
    loadImage(`enemies/e26/e26t2r.png`);

    [0,1,2,3].forEach(anim => {
	loadImage(`enemies/e27/e7s${anim}.png`);
    });
    [1,2,3].forEach(anim => {
	loadImage(`enemies/e28/e7hm${anim}.png`);
    });
    [1,2,3,4,5,6].forEach(anim => {
	loadImage(`enemies/e29/e7m${anim}.png`);
    });

    loadImage(`enemies/cbm1/cbm11.png`);
    loadImage(`enemies/cbm1/cbm12.png`);
    loadImage(`enemies/cbm2/cbm2l1.png`);
    loadImage(`enemies/cbm2/cbm2l2.png`);
    loadImage(`enemies/cbm2/cbm2r1.png`);
    loadImage(`enemies/cbm2/cbm2r2.png`);
    loadImage(`enemies/cbm3/cbm31.png`);
    loadImage(`enemies/cbm3/cbm32.png`);
    loadImage(`enemies/cbm3/cbm33.png`);
    loadImage(`enemies/cbm4/cbm41.png`);
    loadImage(`enemies/cbm4/cbm42.png`);

    loadImage("enemies/zx1/zx1.png");
    loadImage("enemies/zx1/zx2.png");
    loadImage("enemies/zx1/zx3.png");
    loadImage("enemies/zx1/zx4.png");
    loadImage("enemies/zx2/zx1.png");
    loadImage("enemies/zx2/zx2.png");
    loadImage("enemies/zx2/zx3.png");
    loadImage("enemies/zx2/zx4.png");
    loadImage("enemies/zx3/zxL.png");
    loadImage("enemies/zx3/zxR.png");
    loadImage("enemies/zx3/zxLT.png");
    loadImage("enemies/zx3/zxRT.png");
    loadImage("enemies/zx4/zx4L1.png");
    loadImage("enemies/zx4/zx4L2.png");
    loadImage("enemies/zx4/zx4L3.png");
    loadImage("enemies/zx4/zx4R1.png");
    loadImage("enemies/zx4/zx4R2.png");
    loadImage("enemies/zx4/zx4R3.png");

    [...Array(4).keys()].forEach(i => {
	loadImage(`enemies/zxBoss/zxBoss${i+1}.png`);
    });

    [...Array(10).keys()].forEach(i => {
	loadImage(`gem/gem${i+1}.png`)
    });

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
    loadImage("shots/bullet_shot_cbm_r.png");
    loadImage("shots/bullet_shot_cbm_l.png");
    loadImage("shots/bullet_shot_cbm_2r.png");
    loadImage("shots/bullet_shot_cbm_2l.png");
    loadImage("shots/bullet_shot_cbm_3r.png");
    loadImage("shots/bullet_shot_cbm_3l.png");

    loadImage("clouds/c_big.png");
    loadImage("clouds/c_middle.png");
    loadImage("clouds/c_small.png");
    loadImage("ground/ga.png");
    loadImage("ground/ga_sr.png");
    loadImage("ground/ga_sl.png");
    loadImage("ground/sa.png");
    loadImage("ground/ga_cbm.png");
    loadImage("ground/ga_cbm_sr.png");
    loadImage("ground/ga_cbm_sl.png");
    loadImage("ground/sa_cbm.png");
    loadImage("ground/ga_zx.png");
    loadImage("ground/ga_zx_sr.png");
    loadImage("ground/ga_zx_sl.png");
    loadImage("ground/sa_zx.png");
    loadImage("people/standing.png");
    loadImage("people/waving1.png");
    loadImage("people/waving2.png");
    loadImage("people/tp0.png");
    loadImage("people/tp1.png");
    loadImage("people/tp2.png");
    loadImage("people/tp3.png");
    loadImage("people/tp4.png");
    loadImage("people/tp5.png");
    loadImage("people/mw0.png");
    loadImage("people/mw1a.png");
    loadImage("people/mw1b.png");
    loadImage("people/mw2.png");
    [...Array(6).keys()].forEach(n => {
	loadImage(`people/mwt${n+1}.png`);
    });
    loadImage("people/skull.png");
    Array.from({length: 4}, (_v, i) => i+1).forEach(i => loadImage(`people/sheep${i}.png`));
    Array.from({length: 10}, (_v, i) => i+1).forEach(i => loadImage(`people/sheepT${i}.png`));
    loadImage("empty1.png");
    loadImage("bg/ma_far.png");
    loadImage("bg/mal_far.png");
    loadImage("bg/mar_far.png");
    loadImage("bg/ma_cbm3.png");
    loadImage("bg/mal_cbm3.png");
    loadImage("bg/mar_cbm3.png");
    loadImage("bg/ma_zx.png");
    loadImage("bg/mal_zx.png");
    loadImage("bg/mar_zx.png");
    loadImage("bg/ma_near.png");
    loadImage("bg/ma_near2.png");
    loadImage("bg/ma_near3.png");
    loadImage("bg/ma_cbm3_near.png");
    loadImage("bg/ma_zx_near.png");

    loadImage("danger.png");

    loadExplosion("explosionA", "tile", 0, 11, 3);
    loadExplosion("explosionB", "exB", 1, 6);
    loadExplosion("explosionCbm", "cboom", 0, 6);
}

// match: todo: share this code with the server.
function loadExplosion(dir: string, base: string, start: number, end: number, pad?: number) {
    for (let n = start; n <= end; ++n) {
        const tail = (pad == null ? String(n) : String(n).padStart(pad, '0')) + ".png"
        const file = dir + "/" + base + tail;
        loadImage(file);
    }
}

function applyCommand(spec: CommandSpec, pressed: boolean) {
    let ik = spec.command;
    inputs.commands[ik] = pressed;
    sendState();
    if (spec.is_singular) {
        delete inputs.commands[ik];
    }
}

let gStickUp: boolean = false;
let gStickDown: boolean = false;
let gStickLeft: boolean = false;
let gStickRight: boolean = false;
function JoystickMove(event: any) {
    if (event.verticalValue > 0 && !gStickDown) {
	if (gStickUp) {
	    gStickUp = false;
	    applyCommand(UpSpec, false);
	}
	gStickDown = true;
	applyCommand(DownSpec, true);
    }
    if (event.verticalValue < 0 && !gStickUp) {
	if (gStickDown) {
	    gStickDown = false;
	    applyCommand(DownSpec, false);
	}
	gStickUp = true;
	applyCommand(UpSpec, true);
    }
    if (event.verticalValue === 0) {
	gStickUp = gStickDown = false;
	applyCommand(UpSpec, false);
	applyCommand(DownSpec, false);
    }
    if (event.horizontalValue > 0 && !gStickRight) {
	if (gStickLeft) {
	    gStickLeft = false;
	    applyCommand(LeftSpec, false);
	}
	gStickRight = true;
	applyCommand(RightSpec, true);
    }
    if (event.horizontalValue < 0 && !gStickLeft) {
	if (gStickRight) {
	    gStickRight = false;
	    applyCommand(RightSpec, false);
	}
	gStickLeft = true;
	applyCommand(LeftSpec, true);
    }
    if (event.horizontalValue === 0) {
	gStickLeft = gStickRight = false;
	applyCommand(LeftSpec, false);
	applyCommand(RightSpec, false);
    }
}

function ButtonChange(event: any, pressed: boolean) {
    if (pressed && (event.index === 16 || event.index === 8 || event.index === 9)) {
	applyCommand(PauseSpec, pressed);
    }

    else if (event.index === 12) { applyCommand(UpSpec, pressed); }
    else if (event.index === 13) { applyCommand(DownSpec, pressed); }
    else if (event.index === 14) { applyCommand(LeftSpec, pressed); }
    else if (event.index === 15) { applyCommand(RightSpec, pressed); }

    else if (event.index === StandardMapping.Button.B) { applyCommand(ThrustSpec, pressed); }
    else if (event.index === StandardMapping.Button.Y) { applyCommand(ThrustSpec, pressed); }
    else if (event.index === StandardMapping.Button.TRIGGER_LEFT) { applyCommand(ThrustSpec, pressed); }
    else if (event.index === StandardMapping.Button.TRIGGER_RIGHT) { applyCommand(ThrustSpec, pressed); }

    else { applyCommand(FireSpec, pressed); }
}

function gamepadHandler(event: any, connecting: boolean) {
    log("gamepadHandler", connecting ? 'on' : 'off');
    if (connecting) {
	if ( currentGamepad != null ) {
	    currentGamepad.removeEventListener("joystickmove", StandardMapping.Axis.JOYSTICK_LEFT);
	    currentGamepad.removeEventListener("joystickmove", StandardMapping.Axis.JOYSTICK_RIGHT);
	    currentGamepad.removeEventListener("buttonpress");
	    currentGamepad.removeEventListener("buttonrelease");
	}
	currentGamepad = event.gamepad;
	currentGamepad.addEventListener("joystickmove", (e:any) => JoystickMove(e), StandardMapping.Axis.JOYSTICK_LEFT);
	currentGamepad.addEventListener("joystickmove", (e:any) => JoystickMove(e), StandardMapping.Axis.JOYSTICK_RIGHT);
	currentGamepad.addEventListener("buttonpress", (e:any) => ButtonChange(e, true));
	currentGamepad.addEventListener("buttonrelease", (e:any) => ButtonChange(e, false));
    }
}

function init() {
    h5canvas = document.getElementById("canvas");

    // @ts-ignore
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    try { cxAudio = new AudioContext(); } catch(e) { console.error(e); }
    cx2d = h5canvas.getContext("2d");
    if (INVERT_COLORS) {
	// web apis are so utterly terrible.
	cx2d.filter = 'invert(1)';
    }
    loadSounds();
    loadImages();

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    h5canvas.addEventListener("click", onClick, true);

    Gamepads.start();
    Gamepads.addEventListener("connect", (e:any)=> gamepadHandler(e, true));
    Gamepads.addEventListener("disconnect", (e:any)=> gamepadHandler(e, false));

    // kickoff!
    let json: string | undefined = undefined;
    if (localStorage != undefined) {
	// ?? undefined to avoid tsc hell with null.
	json = localStorage.getItem(STORAGE_KEY) ?? undefined;
    }
    sendState(json);
    window.requestAnimationFrame(nextFrame);
}

window.onload = init;
