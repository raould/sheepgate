/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as D from './debug';
import * as Uf from './util/util_feq';
import * as G from './geom';
import { RGBA } from './color';

export const ARCADE_MODE = false;

// !!!!!!!!!! be careful with these
// super local testing hacks! beware!
// they should be git-committed only as false!
export const DEBUG_NO_USER_WAIT = false;
export function user_wait_msec(msec: number): number {
    return DEBUG_NO_USER_WAIT ? 0 : msec;
}
export const DEBUG_HACK_ONLY_HYPERMEGA = false;

// todo: what would be better is to have types for the different
// kinds of values, and to have all this in a dict, and then
// map all the dict values through scaling that is custom per type.

// todo: d2s doesn't really give good results in every case :-(

// todo: split out the 'L' values
// into per-level konfigurations,
// and/or support levels overriding them.
// 'W' into per-weapon konfig.
// keep any unmarked, or marked with 'K'
// here as globals.

// todo: the values in here for things like
// shots and hp and damage are not at all
// balanced or what i want them to be in
// a shipping game. currently they are
// mostly for testing. i think i want the player
// to have very low hp so that it only takes
// like at most 3 shots from enemies to kill the player.
// (todo: better ux around remaining player shield hp!)

// todo: over abstracting means there's a lot of constants
// here and if they are all exported then it gets crazy coupled
// so see about not exporting as much as possible.

// todo: share appropriate subset of this with client code.
// todo: dimension units are (apparently!? i dunno) in pixels,
// move to some logical coordinate abstraction - help to some
// day then be able to scale the screen/gameport/world arbitrarily
// for targeting different display devices.

// todo: units! coordinate systems!
// msec, pixels, units-per-msec, etc.
// world, game, hud, screen, etc.
// shyeah, i wish, typescript!

// for the actual WORLD size see e.g. level_type_a.ts

// i have no idea what this should usefully be set to.
// also this appears to be buggy overall.
export const MAX_CONCURRENT_GAMES = -1; // < 0 is disabled.

export const MAX_HIGH_SCORE_COUNT = 8;

export const WS_PORT = 6969; // K
export const INVALID_CLIENT_ID = Number.NEGATIVE_INFINITY;  // K

export const FPS = 60; // K
export const FRAME_MSEC_DT = 1000 / FPS; // K

// todo: match: the size of the game world is runtime
// calculated, and i want it to be like stargate
// where the whole vertical area is always visible, there's
// no vertical scrolling since that was something i
// never could get the hang of minter's jaguar defender.
// (a nuance is if i want to do some aquatron levels, then
// we'll probably-maybe need y scrolling.)

// external code should ideally use SCREEN_RECT below
export const DESIGN_SIZE = G.v2d_mk(1152, 540); // K
// TODO: want to get up closer to 4K.
export const D2S = 1;
export function d2s(d: number): number {
    return d * D2S;
}
export function d2si(d: number): number {
    return Math.round(d * D2S);
}
export function vd2s(ds: G.V2D): G.V2D {
    return G.v2d_scale(ds, D2S);
}
export function vd2si(ds: G.V2D): G.V2D {
    return G.v2d_scale_i(ds, D2S);
}
export const SCREEN_BOUNDS0 = vd2si(DESIGN_SIZE);
const DESIGN_ASPECT = G.v2d_aspect(DESIGN_SIZE);
const SCREEN_ASPECT = G.v2d_aspect(SCREEN_BOUNDS0);
D.assert(Uf.eqf(DESIGN_ASPECT, SCREEN_ASPECT), "aspect");
// 'design scale' to 'screen scale'.
D.assert(D2S >= 1, "d2s");
// note: don't use this one, generally, use (the inset) SCREEN_RECT.
export const SCREEN_RECT0 = G.v2d_2_rect(SCREEN_BOUNDS0);
// todo: overscan only sorta works, if it gets too big
// you see rendering popin and other grossness.
// and it doesn't scale the world rendering down
// so things like sizzlers overlap the title text.
// todo: ideally would scale and be user configurable, for TVs.
const OVERSCAN_INSET = vd2si(G.v2d_mk(5, 5)); // K
export const SCREEN_RECT = G.rect_inset(SCREEN_RECT0, OVERSCAN_INSET);

// match: client/font.css
// todo: figure out how the hell to measure strings.
export const GAME_FONT = 'gamefont'; // K
export const MENU_FONT = 'menufont'; // K
export const SCORE_FONT = `${d2si(20)}px ${GAME_FONT}`;
export const HUD_MESSAGE_FONT = `${d2si(14)}px ${GAME_FONT}`;

// todo: all the screen -> hud/gameport would be better done with 2d 3x3 matricies.

// the screen has hud at the bottom, and the level's gameplay above.
// it is assumed/expected/desired that the hud is full width,
// and the gameport is full width.
// note that the hud styling means the visual hud is inset.
// **** TODO: some day support right justified text.
// **** TODO: this is a buggy broken poor man's attempt at layout.
const HUD_HEIGHT = d2si(75);
export const HUDPORT_RECT = G.rect_mk(
    G.v2d_sub(G.rect_lb(SCREEN_RECT), G.v2d_mk_0y(HUD_HEIGHT)),
    G.v2d_mk(G.rect_w(SCREEN_RECT), HUD_HEIGHT)
);
export const HUD_OUTLINE_WIDTH = d2si(2);
const HUD_INSET = G.v2d_mk(20, HUD_OUTLINE_WIDTH+1);
export const HUD_VISIBLE_RECT = G.rect_inset(
    HUDPORT_RECT,
    HUD_INSET
);

// radar is centered in the HUD and has to leave room for other hud information on the sides.
const RADAR_HUD_INSET = vd2si(G.v2d_mk_x0(175));
export const RADAR_RECT = G.rect_inset(HUD_VISIBLE_RECT, RADAR_HUD_INSET);
D.assert_fn(G.rect_w(RADAR_RECT), G.rect_w(HUD_VISIBLE_RECT), (a,b)=>a<=b, "radar1");
D.assert_fn(G.rect_b(RADAR_RECT),G.rect_b(HUD_VISIBLE_RECT), (a,b)=>a==b, "radar2");
export const RADAR_MID = G.rect_mid(RADAR_RECT);
// hacky fudge arbitrary inset so the blips don't go under the border vertically, so much.
export const RADAR_SAFE_RECT = G.rect_inset(RADAR_RECT, G.v2d_mk_0y(d2si(10)));
export const RADAR_GAMEPORT_NOTCH_LENGTH = d2si(5);
export const RADAR_GAMEPORT_NOTCH_WIDTH = d2si(3);

const HUD_SIDE_SIZE = G.v2d_scale_v2d(
    G.v2d_sub(
        HUD_VISIBLE_RECT.size,
        G.v2d_mk_x0(G.rect_w(RADAR_RECT))
    ),
    G.v2d_mk(0.5, 1)
);
export const HUD_LEFT_RECT = G.rect_mk(
    HUD_VISIBLE_RECT.lt,
    HUD_SIDE_SIZE,
);
D.assert_fn(G.rect_rt(HUD_LEFT_RECT), G.rect_lt(RADAR_RECT), (a,b)=>G.v2d_eq(a,b), "left");
export const HUD_RIGHT_RECT = G.rect_move(
    G.rect_mk(G.rect_rt(HUD_VISIBLE_RECT), HUD_SIDE_SIZE),
    G.v2d_mk_x0(-HUD_SIDE_SIZE.x)
);
D.assert_fn(G.rect_rt(HUD_RIGHT_RECT), G.rect_rt(HUD_VISIBLE_RECT), (a,b)=>G.v2d_eq(a,b), "right");

// gameport is above the hud area and has no inset; no drawn border.
export const GAMEPORT_RECT = G.rect_mk(
    G.rect_lt(SCREEN_RECT),
    G.v2d_mk(
        G.rect_w(SCREEN_RECT),
        G.rect_h(SCREEN_RECT) - G.rect_h(HUDPORT_RECT)
    )
);
D.assert(G.rect_w(HUDPORT_RECT) == G.rect_w(GAMEPORT_RECT), "hud vs. gameport");
D.assert(G.rect_h(SCREEN_RECT) - (G.rect_h(HUDPORT_RECT) + G.rect_h(GAMEPORT_RECT)) <= 0.01, "screen vs. hud");

// apparently trying to avoid having enemies shoot when too close to the sides.
export const ENEMY_FIRING_INSET = vd2si(G.v2d_mk(20, 0));
export const ENEMY_FIRING_RECT = G.rect_inset(
    GAMEPORT_RECT,
    ENEMY_FIRING_INSET
);

export const GAMEPORT_PLAYER_ZONE_MIN_WIDTH = d2si(80); // match: approx player sprite sizes.
export const GAMEPORT_PLAYER_ZONE_INSET = G.v2d_mk_x0(d2si(80) * 3); // match: approx player sprite sizes.
// match: if PLAYER_DELTA_*_ACC changes then these will likely need adjustment.
// note: the x value is more tricky as it is used in more than one way during GAMEPORT update.
// that is because when the player ship transitions from being outside the default zone
// to being inside it, i don't want the ship's apparent movement speed to suddenly change.
// so the value used to reduce the size of the zone after reversing is used for stepping inside
// the zone, too. got that? :-\
// note: the dynamics here aren't as good as real stargate, either :-(
export const GAMEPORT_PLAYER_ZONE_STEP_X = d2s(0.6); // K but must be per-dt, not per-frame.
export const GAMEPORT_SHAKE = d2si(4); // K

export const OFF_SCREEN = G.v2d_mk_nn(-Number.MAX_SAFE_INTEGER);

export const HUD_FILL_COLOR = RGBA.BLACK; // K
export const HUD_OUTLINE_COLOR = RGBA.DARK_GRAY; // K
export const RADAR_FILL_COLOR = RGBA.BLACK;
export const RADAR_OUTLINE_COLOR = RGBA.new01(0, 0.4, 0.8); // K
export const RADAR_RECT_MIN_SIZE = G.v2d_mk_nn(4);
export const RADAR_GROUND_COLOR = RGBA.GRAY;
export const RADAR_PEOPLE_COLOR = RGBA.YELLOW;
export const DANGER_HPT_THRESHOLD = 0.5; // K
export const DANGER_COLOR = RGBA.MAGENTA.setAlpha01(0.5); // K
export const DANGER_RECT_WIDTH = d2si(10); // K
export const DANGER_LEFT_RECT = G.rect_mk_lt(G.rect_lt(SCREEN_RECT0), G.v2d_set_x(SCREEN_RECT0.size, DANGER_RECT_WIDTH)); // K
export const DANGER_RIGHT_RECT = G.rect_mk_rt(G.rect_rt(SCREEN_RECT0), G.v2d_set_x(SCREEN_RECT0.size, DANGER_RECT_WIDTH)); // K
export const DANGER_IMAGE_SIZE = vd2si(G.v2d_scale_i(G.v2d_mk(140, 26), 0.8)); // K
export const DANGER_IMAGE_LOCATED = { // K
    wrap: false,
    comment: "danger",
    image_located: {
	// todo: this should really maybe be in an ImageResources, not hard-coded here. :-(
	resource_id: "images/danger.png",
	rect: G.rect_mk(
	    G.v2d_mk(
		Math.round(SCREEN_BOUNDS0.x/2 - DANGER_IMAGE_SIZE.x/2),
		Math.round(SCREEN_BOUNDS0.y*0.05)
	    ),
	    DANGER_IMAGE_SIZE
	),
    }
};

export const CLOUD_SIZE = vd2si(G.v2d_mk(80, 20)); // L
export const CLOUD_ALPHA = 0.05; // L

// match: enforce bg's width and world be integer multiples of each other,
// a) so we can try to avoid floating point error 'seams' between sprites.
// b) so we can get the parallax working, and across the world-wrap boundary.
export const TILE_WIDTH = d2si(256); // L
export const BG_FAR_BG_SIZE = G.v2d_mk(TILE_WIDTH, d2si(260)); // L
export const BG_NEAR_BG_SIZE = G.v2d_mk(TILE_WIDTH, d2si(80)); // L
// match: ground_y
// match: BG_LAYER_SCALE
// match: TILE_WIDTH so that they line up in parallax.
// todo: some different scale of TILE_WIDTH?
// thus far, there must be BG_LAYER_SCALE*BG_LAYER_SCALE ground tiles for every single far bg tile.
// thus far, there must be BG_LAYER_SCALE ground tiles for every single near bg tile.
export const GROUND_SIZE = G.v2d_mk(TILE_WIDTH, d2si(40)); // L
D.assert_eqeq(BG_NEAR_BG_SIZE.x, TILE_WIDTH, "bg tile width");
D.assert_eqeq(BG_NEAR_BG_SIZE.x, TILE_WIDTH, "bg tile height");
D.assert_eqeq(GROUND_SIZE.x, TILE_WIDTH, "ground tile width");

export const BASE_SIZE = vd2si(G.v2d_mk(128, 32)); // L // ugh position is elsewhere.
// the base shield alpha has to be
// non-zero because zero means hidden and
// thus non-interactive, which would prevent transports.
export const BASE_SHIELD_ALPHA = 0.1;
export const BASE_SHIELD_SCALE = G.v2d_mk(1.2, 2);

// match: db.shared.world.ground_y
// match: the bg sprite resources.
// near bg tile width = 1/2 of ground.
// near bg tile x speed = 1/2 of ground.
// far bg tile width = 1/4 of ground.
// far bg tile x speed = 1/4 of ground.
// but since we can't have 1/4th of a far mountain,
// we take the far mountain size as the minimum and
// scale up from there hence '2' instead of '1/2'.
export const BG_LAYER_SCALE = 2;

// player should be not super hard to kill so
// they have to actually try to dodge enemy bullets.
// note/todo: odd that i set this to MAX but the player can still die when crashing into other shields?!
export const PLAYER_HP = 40;
export const PLAYER_LIVES = 3;

// attempting to be somewhat color-deficiency accessible.
export const BAD_COLOR = RGBA.new0255(202, 0, 32);
export const GOOD_COLOR = RGBA.new0255(5, 133, 176);
export const PLAYER_COLOR = RGBA.new0255(255, 255, 128);

// shields are faded but will flare up when hit.
export const SHIELD_ALPHA = 0.2; // K? // L?
// todo: this maybe will need to be per-kind-of-sprite probably?
export const SHIELD_SCALE = G.v2d_mk(1.5, 1.5); // K? // L?
export const SHIELD_BAR_WIDTH = d2si(65);
export const SHIELD_BAR_HEIGHT = d2si(2);
export const SHIELD_BAR_OFFSET_Y = d2si(10);
export const SHIELD_DAMAGE_COLOR = BAD_COLOR;
export const SHIELD_HP_COLOR = GOOD_COLOR;

// pixels/dt? pixels/sec? i dunno!
export const PLAYER_SHOT_DAMAGE = 5; // W
export const PLAYER_SHOT_SPEED = d2si(1); // W // note that enemies use a scaled version of this. :-\
export const PLAYER_SHOT_LIFE_MSEC = 500; // W
export const PLAYER_SHOT_SIZE = vd2si(G.v2d_mk(30, 5)); // W // note: it gets dynamically altered during lifetime.
export const PLAYER_WEAPON_CLIP_COOLDOWN_MSEC = 300; // W
export const PLAYER_WEAPON_SHOT_COOLDOWN_MSEC = 50; // W
export const PLAYER_WEAPON_SHOT_COUNT = 3; // W
export const BULLET_SHOT_SPEED = d2s(0.7); // W // note that enemies use a scaled version of this. :-\
export const BULLET_SHOT_LIFE_MSEC = 3000; // W
export const BULLET_SHOT_SIZE = vd2si(G.v2d_mk(44, 3)); // W
export const BALL_SHOT_SIZE = vd2si(G.v2d_mk(6, 6)); // W

// note: explosions should have slightly different timings
// so they don't appear in lock-step e.g. when things crash
// into each other.
export const EXPLOSION_MSEC = 750; // K

// pixels/dt? pixels/sec? i dunno!
export const DRAG_ACC = vd2s(G.v2d_mk(-0.0025, -0.005)); // L
// match: if the PLAYER_DELTA_*_ACC changes then likely
// the gameport zone code will need adjustment.
// pixels/dt? pixels/sec? i dunno!
export const PLAYER_DELTA_X_ACC = d2s(0.0015); // K
export const PLAYER_DELTA_Y_VEL = d2s(0.2); // K

export const PLAYER_BEAM_MAX_VEL2 = d2s(0.2); // K
export const SHEEP_SIZE = vd2si(
    G.v2d_scale_v2d_i(
	G.v2d_mk(20, 26),
	G.v2d_mk(2.2, 1.8)
    )
); // K
// match: people.ts, currently hardcoded to have 2 people per cluster.
// even this is too much toing and froing?
export const CLUSTER_COUNT_MAX = 4; // K
export const PEOPLE_REMINDER_TIMEOUT = 3 * 1000; // K

export const GEM_HP_BONUS = 3; // keep it smallish.

// todo: !!!! too many collision buckets as this gets bigger !!!!
// note: avoid floating point error causing bins to not fully abut.
export const MIN_BIN_SIZE = d2si(10); // K
export const MAX_BIN_X_COUNT = 10; // K
export const MAX_BIN_Y_COUNT = 10; // K // todo: make this smaller, like 5.

// todo: would be cool for this to be dynamically speeding up when thrusting.
export const PLAYER_ANIM_FRAME_MSEC = 1000 / 5; // K.

export const SHIELD_HIT_ANIM_MSEC = 0.5 * 1000; // K? // L?
export const SHIELD_HIT_ANIM_RADIUS = d2s(0.1); // arbitrary hack. // K? // L?

// match: explosion particle generator is an 8-way.
export const EXPLOSION_PARTICLE_COUNT = 8 * 3; // K
export const EXPLOSION_PARTICLE_DURATION_MSEC = 500; // K
export const EXPLOSION_PARTICLE_SPEED = d2s(0.5); // units? K
// match: shield hit particle generator is an ellipse.
export const SHIELD_HIT_PARTICLE_COUNT = 10; // K
export const SHIELD_HIT_PARTICLE_DURATION_MSEC = 200; // K
export const SHIELD_HIT_PARTICLE_SPEED = d2s(0.15); // units? K

// empty means you wanted it to not be there,
// missing means it wasn't found and is a bug.
// match: client
export const EMPTY_IMAGE_RESOURCE_ID = "empty1.png"; // K
export const MISSING_IMAGE_RESOURCE_ID = "missing.png"; // K

export const SCORE_POS = vd2si(G.v2d_mk(100, 20)); // K

export const TELEPORT_ANIM_FRAME_MSEC = 100; // K

export const WARPIN_TOTAL_MSEC = 500; // K

// note/todo: not much time yet spent on real game balance for these (or any) values.

// basic enemies should be one-shots, that's why they are basic.
// they also should not drop any gems, that's why they are basic.
// they should also not show their hp meter to reduce chartjunk.
export const ENEMY_BASIC_HP = PLAYER_SHOT_DAMAGE; // L
export const ENEMY_BASIC_DAMAGE = Math.ceil(PLAYER_HP/5); // L
export const ENEMY_BASIC_GEM_COUNT = 0; // L
D.assert(ENEMY_BASIC_DAMAGE >= 1, "enemy basic damage");

export const ENEMY_SMALL_HP = PLAYER_SHOT_DAMAGE * 4; // L
export const ENEMY_SMALL_DAMAGE = Math.ceil(PLAYER_HP/4); // L
export const ENEMY_SMALL_GEM_COUNT = 1;
D.assert(ENEMY_SMALL_DAMAGE >= 1, "enemy small damage");

export const ENEMY_MEGA_HP = PLAYER_SHOT_DAMAGE * 12; // L
export const ENEMY_MEGA_DAMAGE = Math.ceil(PLAYER_HP/2); // L
export const ENEMY_MEGA_GEM_COUNT = 2;
D.assert(ENEMY_MEGA_DAMAGE >= 1, "enemy mega damage");

export const ENEMY_HYPERMEGA_HP = PLAYER_SHOT_DAMAGE * 30; // L
export const ENEMY_HYPERMEGA_DAMAGE = PLAYER_HP; // L
// if the final enemy generated any gems then there'd
// be an annoying race condition ux problem of ending the
// level until/before they can be picked up by the player.
export const ENEMY_HYPERMEGA_GEM_COUNT = 0;
D.assert(ENEMY_HYPERMEGA_DAMAGE >= 1, "enemy hypermega damage");

export const ENEMY_POD_HP = PLAYER_SHOT_DAMAGE; // L
export const ENEMY_POD_DAMAGE = Math.ceil(PLAYER_HP/4); // L
export const ENEMY_POD_SWARMER_COUNT = 3; // L

export const ENEMY_SWARMER_HP = PLAYER_SHOT_DAMAGE; // L
export const ENEMY_SWARMER_DAMAGE = Math.ceil(PLAYER_HP/6); // L

// harass the player when all enemies are gone but there are still people to rescue.
export const MUNCHIES_MAX = 2; // L, is adjusted per level.
export const ENEMY_MUNCHIE_HP = PLAYER_SHOT_DAMAGE; // L
export const ENEMY_MUNCHIE_DAMAGE = Math.ceil(PLAYER_HP/4); // L
export const ENEMY_MUNCHIE_GEM_COUNT = 0; // L

export const ENEMY_RETURN_FIRE_MAX_MSEC = 250; // L
export const ENEMY_RETURN_FIRE_MIN_MSEC = 100; // L

// note: these are not actual paths to anything used
// on disk by the client at runtime, they are just names,
// but they do have to be like the format `sounds/${resource}`.
export const TRACK1_SFX = "sounds/track1.ogg";
export const KCART1_SFX = "sounds/kcart1.ogg";
export const HISCORE_SFX = "sounds/hiscore.ogg";
export const WIGGLE_SFX = "sounds/wiggle.ogg";
export const BEGIN_SFX = "sounds/begin.ogg";
export const THRUST_SFX = "sounds/thrust.ogg";
export const BEAMDOWN_SFX = "sounds/beamdown.ogg";
export const BEAMUP_SFX = "sounds/beamup.ogg";
export const EXPLOSION_SFX = "sounds/explosion.ogg";
export const EXPBOOM_SFX = "sounds/expboom.ogg";
export const GEM_COLLECT_SFX = "sounds/gem_collect.ogg";
export const PLAYER_SHOOT0_SFX = "sounds/player_shoot0.ogg";
export const PLAYER_SHOOT1_SFX = "sounds/player_shoot1.ogg";
export const PLAYER_SHOOT2_SFX = "sounds/player_shoot2.ogg";
export const WARPIN_SFX = "sounds/warpin.ogg";
export const SYNTH_A_SFX = "sounds/synthA.ogg";
export const SYNTH_B_SFX = "sounds/synthB.ogg";
export const SYNTH_C_SFX = "sounds/synthC.ogg";
export const SYNTH_D_SFX = "sounds/synthD.ogg";
export const SYNTH_E_SFX = "sounds/synthE.ogg";
export const SHOT1_SFX = "sounds/shot1.ogg";
export const SHOT2_SFX = "sounds/shot2.ogg";
export const SMARTBOMB_SFX = "sounds/smartbomb.ogg";
export const SWARMER_SFX = "sounds/swarmer.ogg";
export const DEFFX_SFX = "sounds/deffx.ogg";

// match: game.ts
// used to scale things across levels.
export const LEVEL_TEMPLATE_COUNT = 9;

export const USER_SKIP_TEXT = "PRESS [FIRE] TO CONTINUE";
