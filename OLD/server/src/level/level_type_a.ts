/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Lv from './level';
import * as Lemk from './enemy_mk';
import * as Gs from '../game_stepper';
import * as GDB from '../game_db';
import * as K from '../konfig';
import * as Cmd from '../commands';
import * as G from '../geom';
import * as F from '../facing';
import * as Img from './level_images';
import * as Gr from '../ground';
import * as B from '../base';
import * as Po from '../people';
import * as Sk from '../sky';
import * as C from '../collision';
import * as Tf from '../type_flags';
import * as S from '../sprite';
import * as Dr from '../drawing';
import * as ES from '../empty_sprite';
import * as Pl from '../player';
import * as Eag from '../enemy/enemy_adv_generator';
import * as Ebg from '../enemy/enemy_basic_generator';
import Em from '../enemy/enemy_munchie';
import * as Sc from '../scoring';
import * as Hs from '../high_scores';
import * as U from '../util/util';
import * as D from '../debug';
import * as Rnd from '../random';
import { RGBA, HCycle } from '../color';
import { DebugGraphics } from '../debug_graphics';
import * as _ from 'lodash';

// funny that thus far there's no type B.

export type warpin_mk = (db: GDB.GameDB) => U.O<S.Sprite>;

export interface LevelEnemyKonfig {
    mk: Lemk.Warpin_Mk;
    count: number,
    limit: number,
}

export interface LevelKonfig {
    Eb1?: LevelEnemyKonfig,
    Eb2?: LevelEnemyKonfig,
    Eb3?: LevelEnemyKonfig,
    Eb4?: LevelEnemyKonfig,
    Eb5?: LevelEnemyKonfig,
    Eb6?: LevelEnemyKonfig,
    Eb7?: LevelEnemyKonfig,
    Eb8?: LevelEnemyKonfig,
    Es?: LevelEnemyKonfig,
    Em?: LevelEnemyKonfig,
    Ehm?: LevelEnemyKonfig,
    BG_COLOR: RGBA,
    people_cluster_count: number,
};

interface FarSpec0 {
    resource_name: string,
    type: Gr.BgFarType,
    x: number,
    alpha: number
}

// there might be variations of levels, this represents
// the core mechanisms for one kind/type/config/category/style
// of levels, called "TypeA".

export abstract class AbstractLevelTypeA extends Lv.AbstractLevel {
    abstract small_snapshot: S.ImageSized;
    abstract mega_snapshot: S.ImageSized;
    abstract hypermega_snapshot: S.ImageSized;
    db: GDB.GameDB; // todo: a LevelDB for level specific things?
    state: Gs.StepperState;
    people_reminder_timeout: U.O<number>;
    reminder_cycle: HCycle;

    get_state(): Gs.StepperState { return this.state; }
    get_scoring(): Sc.Scoring { return this.db.local.scoring; }

    constructor(public readonly index1: number, private readonly konfig: LevelKonfig, score: number, high_score: Hs.HighScore) {
	super(high_score);
	D.log(`new level_type_a for index1 ${index1}!`);
	this.state = Gs.StepperState.running;
        this.reminder_cycle = HCycle.newFromRed(90 / K.FRAME_MSEC_DT);
	const far_spec0 = this.far_spec0_mk();
	this.db = this.db_mk(far_spec0, score);
	this.init_bg(far_spec0);
	this.init_player();
	this.init_enemies();

	// prime the history pump with a minimal copy.
	// note: duh, if anything above needs db.local.prev_db
	// then they will be broken because it is undefined there.
	this.db.local.prev_db = _.cloneDeep(this.db);

	// todo: unhack this crappy hack. we run the simulation
	// one step in order for things to settle. otherwise the
	// world visibly jumps badly from frame 1 to frame 2.
	this.step();
	
	this.db.shared.sfx.push({ sfx_id: K.BEGIN_SFX });
    }

    private db_mk(far_spec0: FarSpec0[], score: number): GDB.GameDB {
	// match: ground level, mountains, world height, etc. K.TILE_WIDTH.
	// match: project_far_specs()
	const world_size = G.v2d_mk(
	    far_spec0.length * Gr.far2ground_scale * K.GROUND_SIZE.x,
	    K.GAMEPORT_RECT.size.y
	);
	
	const dbc = this.sharedCore_mk(world_size);
	const uncloned = this.uncloned_mk(dbc, this.index1, world_size);
	const local = this.local_mk(dbc, this.index1, score, world_size);
	const shared = this.sharedItems_mk(dbc, uncloned.images);
	return {
	    uncloned: uncloned,
	    local: local,
	    shared: shared,
	};
    }

    private init_player() {
	const b = this.db.shared.items.base;
	D.assert(!!b);
	const lt = G.v2d_mk(
	    this.db.shared.items.base.lt.x,
	    K.GAMEPORT_RECT.lt.y + K.GAMEPORT_RECT.size.y * 0.60,
	);
	this.db.shared.items.player = Pl.player_mk(
	    this.db,
	    GDB.id_mk(),
	    {
		facing: F.Facing.right,
		lt: lt,
	    }
	);
	Pl.add_shield(this.db, this.db.shared.items.player);
	this.db.shared.items.player_shadow = Pl.player_shadow_mk(
	    this.db,
	    GDB.id_mk(),
	    {
		facing: F.Facing.right,
		lt: lt,
	    }
	);
    }

    private init_bg(far_spec0: FarSpec0[]) {
	Sk.sky_mk(this.db);
	const far_spec_images: Gr.FarSpec[] = far_spec0.map((e: FarSpec0): Gr.FarSpec => ({
	    ...e,
	    images_spec: { resource_id: this.db.uncloned.images.lookup(e.resource_name) }
	}));
	Gr.bg_mk(this.db, far_spec_images);
	Gr.ground_mk(this.db, far_spec_images);
	B.base_add(this.db);
	Po.populate(
	    this.db,
	    this.konfig.people_cluster_count
	);
    }

    far_spec0_mk(): FarSpec0[] {
	// todo: extract out the x calculations,
	// make something more interesting,
	// make it so the world can fit more far's
	// w/out getting too large.
	const alpha = 0.2;
	const far_spec0 = [
	    {
		resource_name: "bg/mal_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    },
	    {
		resource_name: "bg/ma_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    },
	    {
		resource_name: "bg/ma_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    },
	    {
		resource_name: "bg/mar_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    },
	    {
		resource_name: K.EMPTY_IMAGE_RESOURCE_ID,
		type: Gr.BgFarType.empty,
		alpha: alpha
	    },
	]
	      .map((f, i): FarSpec0 => ({ ...f, x: K.BG_FAR_BG_SIZE.x * i }));
	return far_spec0;
    }

    private init_enemies() {
	// note: i don't have nor am ever likely to implement a
	// general solution that keeps track of all the #'s and types
	// of enemies generated & defeated so that these generators
	// can query those values and react accordingly. no, no, instead
	// this is going to be a crappy half-hard-coded state machine hack.
	const spec: Eag.AddGeneratorsSpec = {}
	if (U.exists(this.konfig.Es)) {
	    spec.small = {
		comment: "enemy-gen-small",
		generations: this.konfig.Es?.count,
		max_alive: this.konfig.Es?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Es?.mk(db);
		}
	    }
	}
	if (U.exists(this.konfig.Em)) {
	    spec.mega = {
		comment: "enemy-gen-mega",
		generations: this.konfig.Em?.count,
		max_alive: this.konfig.Em?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Em?.mk(db);
		}
	    }
	}
	if (U.exists(this.konfig.Ehm)) {
	    spec.hypermega = {
		comment: "enemy-gen-hypermega",
		generations: this.konfig.Ehm?.count,
		max_alive: this.konfig.Ehm?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Ehm?.mk(db);
		}
	    }
	}
	Eag.add_generators(this.db, spec);

	const basics: Ebg.EnemyGeneratorSpec[] = [];
	if (U.exists(this.konfig.Eb1)) {
	    basics.push({
		comment: "enemy-gen-basic1",
		generations: this.konfig.Eb1?.count,
		max_alive: this.konfig.Eb1?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb1?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb2)) {
	    basics.push({
		comment: "enemy-gen-basic2",
		generations: this.konfig.Eb2?.count,
		max_alive: this.konfig.Eb2?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb2?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb3)) {
	    basics.push({
		comment: "enemy-gen-basic3",
		generations: this.konfig.Eb3?.count,
		max_alive: this.konfig.Eb3?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb3?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb4)) {
	    basics.push({
		comment: "enemy-gen-basic4",
		generations: this.konfig.Eb4?.count,
		max_alive: this.konfig.Eb4?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb4?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb5)) {
	    basics.push({
		comment: "enemy-gen-basic5",
		generations: this.konfig.Eb5?.count,
		max_alive: this.konfig.Eb5?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb5?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb6)) {
	    basics.push({
		comment: "enemy-gen-basic6",
		generations: this.konfig.Eb6?.count,
		max_alive: this.konfig.Eb6?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb6?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb7)) {
	    basics.push({
		comment: "enemy-gen-basic7",
		generations: this.konfig.Eb7?.count,
		max_alive: this.konfig.Eb7?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb7?.mk(db); // wtf tsc?
		}
	    });
	}
	if (U.exists(this.konfig.Eb8)) {
	    basics.push({
		comment: "enemy-gen-basic8",
		generations: this.konfig.Eb8?.count,
		max_alive: this.konfig.Eb8?.limit,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    db.shared.sfx.push({ sfx_id: K.WARPIN_SFX, gain: 0.25 });
		    return this.konfig.Eb8?.mk(db); // wtf tsc?
		}
	    });
	}
	D.assert(basics.length > 0, "no basic enemies found?!");
	Ebg.add_generators(this.db, basics);
    }

    private are_all_enemies_done(next: GDB.GameDB): boolean {
	// note: this isn't totally correct e.g. if you hack a level
	// to only have 1 Rank.small and you shoot it, this still doesn't trigger?!
	// note: do not include munchies.
	return U.count_dict(next.local.enemy_generators) == 0 &&
	    U.count_dict(next.shared.items.warpin) == 0 &&
	    U.count_dict(next.shared.items.enemies) == 0 &&
	    U.count_dict(next.shared.items.explosions) == 0;
    }

    // people on the ground + people in the ship.
    private get_people_count(next: GDB.GameDB): number {
	const pc = U.count_dict(next.shared.items.people);
	const ppc = GDB.get_beaming_count(next);
	return pc + ppc;
    }

    update_impl(next: GDB.GameDB) {
	// debugging...
	if (!!next.local.client_db.inputs.commands[Cmd.CommandType.debug_win_level]) {
	    this.state = Gs.StepperState.completed;
	    return;
	}
	if (!!next.local.client_db.inputs.commands[Cmd.CommandType.debug_lose_level]) {
	    this.state = Gs.StepperState.lost;
	    return;
	}
	if (!!next.local.client_db.inputs.commands[Cmd.CommandType.debug_smite]) {
	    Object.values(next.shared.items.enemies).forEach(e => {
		const sid = e.shield_id;
		if (U.exists(sid)) {
		    const shield = next.shared.items.shields?.[sid];
		    shield.hp = 0;
		}
	    });
	}
	// ...debugging
	
	if (this.state == Gs.StepperState.running) {
	    // the player bought the farm?
	    if (GDB.get_player(next) == null) {
		if (!Object.values(next.shared.items.explosions).some(e => U.has_bits(e.type_flags, Tf.TF.playerExplosion))) {
		    // todo: permadeath vs. more player lives left? intro state of new life.
		    this.state = Gs.StepperState.lost;
		    return;
		}
	    }
	    // all tasks accomplished?
	    if (this.are_all_enemies_done(next)) {
		if (this.get_people_count(next) == 0) {
		    this.state = Gs.StepperState.completed;
		    return;
		}
		// harass the player while they try to finish picking up people.
		else if (this.index1 > 1) {
		    const count = U.count_dict(next.shared.items.munchies);
		    if (count < K.MUNCHIES_MAX + Math.floor(this.index1 / 5)) {
			const chance = 0.002 + (this.index1 * 0.0005);
			if (Rnd.singleton.boolean(chance)) {
			    const m = Em.warpin_mk(next);
			    if (U.exists(m)) {
				GDB.add_item(next.shared.items.warpin, m);
			    }
			}
		    }
		}
	    }
	}
    }

    protected update_alerts(next: GDB.GameDB) {
	super.update_alerts(next);
	this.update_rescue_alert(next);
    }

    private update_rescue_alert(next: GDB.GameDB) {
	if (this.are_all_enemies_done(next) &&
	    this.get_people_count(next) > 0 &&
    	    U.isU(this.people_reminder_timeout)) {
	    this.people_reminder_timeout = K.PEOPLE_REMINDER_TIMEOUT;
	}
	if (U.exists(this.people_reminder_timeout) && this.people_reminder_timeout > 0) {
	    const reminder: Dr.DrawText = {
		wrap: false,
		// hard-coded eye-balled positioning.
		lb: G.v2d_mk(K.GAMEPORT_RECT.size.x * 0.335, K.GAMEPORT_RECT.size.y/2),
		font: `60px ${K.MENU_FONT}`,
		fillStyle: this.reminder_cycle.next().setAlpha01(
		    U.t01(0, K.PEOPLE_REMINDER_TIMEOUT, this.people_reminder_timeout)
		),
		text: "RESCUE PEOPLE!",
		comment: "save-people-reminder",
	    };
	    next.shared.hud_drawing.texts.push(reminder);
	    this.people_reminder_timeout -= K.FRAME_MSEC_DT; // todo: the whole DT things is poorly implemented.
	}
    }

    private sharedCore_mk(world_size: G.V2D): GDB.DBSharedCore {
	// *** warning: note that all of shared round-trips with the client! ***
	const ground_y = world_size.y - K.GROUND_SIZE.y;
	const shared: GDB.DBSharedCore = {
	    kind: "Game",
	    sfx: [],
	    world: (() => {
		return {
		    screen: K.SCREEN_RECT,
		    bounds0: world_size,
		    ground_y: ground_y,
		    ground_bounds: G.rect_mk(
			G.v2d_mk_0(),
			G.v2d_mk(world_size.x, ground_y)
		    ),			
		    gameport: {
			world_bounds: {
			    // match: lt gets updated by gameport_step().
			    lt: G.v2d_mk_0(),
			    size: K.GAMEPORT_RECT.size
			},
			screen_bounds: K.GAMEPORT_RECT,
			enemy_firing_bounds: K.ENEMY_FIRING_RECT
		    }
		};
	    })(),
	    level_index1: this.index1,
	    bg_color: this.konfig.BG_COLOR,
	    screen_shake: G.v2d_mk_0(),
	    tick: 0,
	    sim_now: 0,
	    fps: 0,
	    debug_graphics: DebugGraphics.get_graphics(),
	    hud_drawing: Dr.drawing_mk(),
	    frame_drawing: Dr.drawing_mk(),
	    permanent_bg_drawing: Dr.drawing_mk(),
	    permanent_fg_drawing: Dr.drawing_mk(),
	};
	return shared;
    }

    private uncloned_mk(dbc: GDB.DBSharedCore, index1: number, world_size: G.V2D): any {
	const collision_spacey_pad = K.PLAYER_SHIP_SIZE.y * 5; // match: empirical player constraints.
	const collision_bounds = G.rect_mk(
	    G.v2d_mk(0, -collision_spacey_pad),
	    G.v2d_mk(world_size.x, world_size.y + collision_spacey_pad)
	)
	const collision = new C.Collision(collision_bounds);
	return {
	    images: Img.images_mk(index1),
	    collision: collision
	};
    }

    private local_mk(dbc: GDB.DBSharedCore, index1: number, score: number, world_size: G.V2D): any {
	const e2s = new Map<Sc.Event, number>([
	    [Sc.Event.rescue, 10],
	    [Sc.Event.easy_defeat, 10],
	    [Sc.Event.medium_defeat, 15],
	    [Sc.Event.hard_defeat, 20],
	    [Sc.Event.boss_defeat, 50],
	]);
	const local: GDB.DBLocal = {
	    // client_db is temporary until the client sends us a real db, duh.
	    client_db: {
		client_id: K.INVALID_CLIENT_ID,
		inputs: {commands:{}, keys: {}},
		debugging_state: { is_stepping: false, is_drawing: false },
	    },
	    // normally NOT ok to use just {} for prev_db, but prev_db gets auto set up by the abstract base class.
	    prev_db: {} as GDB.GameDB,
	    frame_dt: 0,
	    fps_marker: { tick: 0, msec: 0 },
	    state_modifiers: [],
	    ticking_generators: {},
	    enemy_generators: {},
	    player_zone_width: K.GAMEPORT_PLAYER_ZONE_MIN_WIDTH,
	    scoring: Sc.scoring_mk(score, e2s),
	    toasts: {},
	    hud: {
		left: K.HUD_LEFT_RECT,
		right: K.HUD_RIGHT_RECT,
		radar: {
		    scale: G.bounds2bounds(world_size, K.RADAR_SAFE_RECT.size),
		    rect: K.RADAR_RECT,
		    inset_rect: K.RADAR_SAFE_RECT
		}
	    }
	};
	return local;
    }

    private sharedItems_mk(dbc: GDB.DBSharedCore, images: GDB.ImageResources): GDB.DBShared {
	const dbs: GDB.DBShared = {
	    ...dbc,
	    items: {
		player: undefined,
		player_shadow: undefined,
		warpin: {},
		enemies: {},
		munchies: {},
		shields: {},
		shots: {},
		explosions: {},
		// most here below get filled at the end of the level's constructor.
		sky: {},
		bgFar: {},
		bgNear: {},
		ground: [],
		// todo: wow this fake pre-base hack is nasty.
		base: {
		    ...ES.EmptySprite,
		    set_lifecycle(_: GDB.Lifecycle) {},
		    on_collide(db: GDB.GameDB, dst: S.CollidableSprite): void {},
		    beam_down_rect: G.rect_mk_0()
		},
		people: {},
		gems: {},
		fx: {},
		particles: {},
	    }
	};
	return dbs;
    }
}
