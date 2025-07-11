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
const RESCUE_FONT = `${K.d2si(60)}px ${K.MENU_FONT}`;

export interface LevelEnemyKonfig {
    mk: Lemk.Warpin_Mk;
    count: number,
    limit: number,
    delay_msec: number,
    tick_msec: number,
}

export interface LevelKonfig {
    player_kind: S.PlayerKind;
    player_disable_beaming?: boolean; // default falsy.
    Eb1?: LevelEnemyKonfig,
    Eb2?: LevelEnemyKonfig,
    Eb3?: LevelEnemyKonfig,
    Eb4?: LevelEnemyKonfig,
    Eb5?: LevelEnemyKonfig,
    Eb6?: LevelEnemyKonfig,
    Eb7?: LevelEnemyKonfig,
    Eb8?: LevelEnemyKonfig,
    Ebs1?: LevelEnemyKonfig, // 's'pecial e.g. cbm.
    Ebs2?: LevelEnemyKonfig, // 's'pecial e.g. cbm.
    Ep?: LevelEnemyKonfig,
    Es?: LevelEnemyKonfig,
    Em?: LevelEnemyKonfig,
    Ehm?: LevelEnemyKonfig,
    BG_COLOR: RGBA,
    people_cluster_count: number,
    ground_kind: Gr.GroundKind,
};

interface FarSpec0 {
    resource_name: string,
    type: Gr.BgFarType,
    x: number,
    alpha: number
}

type PreFarSpec0 = Omit<FarSpec0, "x">;

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
    get_lives(): number { return this.db.shared.player_lives; }

    constructor(public readonly index1: number, private readonly konfig: LevelKonfig, score: number, lives: number, public high_score: Hs.HighScore) {
	super();
	D.log(`new level_type_a for index1 ${index1}!`);
	this.state = Gs.StepperState.running;
        this.reminder_cycle = HCycle.newFromRed(90 / K.FRAME_MSEC_DT);
	this.db = this.db_mk(score, lives);
    }

    // todo: this is horrible mutable badness.
    lose_life(): void {
	if (this.get_lives() > 0) {
	    this.state = Gs.StepperState.running;
            this.reminder_cycle = HCycle.newFromRed(90 / K.FRAME_MSEC_DT);
	    this.db = this.db_mk(this.get_scoring().score, this.get_lives()-1);
	}
    }

    private db_mk(score: number, lives: number): GDB.GameDB {
	const far_spec0 = this.far_spec0_mk(this.konfig.ground_kind);
	const db = this.db_mk0(far_spec0, score, lives, this.konfig.player_kind);
	this.init_bg(db, far_spec0, this.konfig.ground_kind);
	this.init_player(db, this.konfig.player_kind, !!this.konfig.player_disable_beaming);
	this.init_enemies(db);

	// prime the history pump with a minimal copy.
	// note: duh, if anything above needs db.local.prev_db
	// then they will be broken because it is undefined there.
	db.local.prev_db = _.cloneDeep(db);

	return db;
    }

    private db_mk0(far_spec0: FarSpec0[], score: number, lives: number, player_kind: S.PlayerKind): GDB.GameDB {
	// match: ground level, mountains, world height, etc. K.TILE_WIDTH.
	// match: project_far_specs()
	const world_size = G.v2d_mk(
	    far_spec0.length * Gr.far2ground_scale * K.GROUND_SIZE.x,
	    K.GAMEPORT_RECT.size.y
	);
	
	const dbc = this.sharedCore_mk(world_size, lives);
	const uncloned = this.uncloned_mk(dbc, this.index1, world_size, player_kind);
	const local = this.local_mk(dbc, this.index1, score, world_size);
	const shared = this.sharedItems_mk(dbc, uncloned.images);
	return {
	    uncloned: uncloned,
	    local: local,
	    shared: shared,
	};
    }

    private init_player(db: GDB.GameDB, player_kind: S.PlayerKind, disable_beaming: boolean) {
	const b = db.shared.items.base;
	D.assert(!!b);
	const lt = G.v2d_mk(
	    db.shared.items.base.lt.x,
	    K.GAMEPORT_RECT.lt.y + K.GAMEPORT_RECT.size.y * 0.60,
	);
	db.shared.items.player = Pl.player_mk(
	    db,
	    GDB.id_mk(),
	    {
		player_kind,
		disable_beaming,
		facing: F.Facing.right,
		lt,
	    }
	);
	Pl.add_shield(db, db.shared.items.player);
	db.shared.items.player_shadow = Pl.player_shadow_mk(
	    db,
	    GDB.id_mk(),
	    {
		player_kind,
		facing: F.Facing.right,
		lt,
	    }
	);
    }

    private init_bg(db: GDB.GameDB, far_spec0: FarSpec0[], ground_kind: Gr.GroundKind) {
	Sk.sky_mk(db);
	// the ordering of everything else below here has to be thus due to dependencies.
	const far_spec_images: Gr.FarSpec[] = far_spec0.map((e: FarSpec0): Gr.FarSpec => ({
	    ...e,
	    images_spec: { resource_id: db.uncloned.images.lookup(e.resource_name) }
	}));
	Gr.bg_mk(db, far_spec_images, ground_kind);
	Gr.ground_mk(db, far_spec_images, ground_kind);
	B.base_add(db, ground_kind);
	Po.populate(
	    db,
	    ground_kind,
	    this.konfig.people_cluster_count
	);
    }

    private far_spec0_mk_empty(ground_kind: Gr.GroundKind, alpha: number): PreFarSpec0 {
	return {
	    resource_name: K.EMPTY_IMAGE_RESOURCE_ID,
	    type: Gr.BgFarType.empty,
	    alpha: alpha
	};
    }

    private far_spec0_mk_left(ground_kind: Gr.GroundKind, alpha: number): PreFarSpec0 {
	switch (ground_kind) {
	case Gr.GroundKind.regular: {
	    return {
		resource_name: "bg/mal_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.cbm: {
	    return {
		resource_name: "bg/mal_cbm3.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.zx: {
	    return {
		resource_name: "bg/mal_zx.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    }
	}
	}
    }

    private far_spec0_mk_right(ground_kind: Gr.GroundKind, alpha: number): PreFarSpec0 {
	switch (ground_kind) {
	case Gr.GroundKind.regular: {
	    return {
		resource_name: "bg/mar_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.cbm: {
	    return {
		resource_name: "bg/mar_cbm3.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.zx: {
	    return {
		resource_name: "bg/mar_zx.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    }
	}
	}
    }

    private far_spec0_mk_middle(ground_kind: Gr.GroundKind, alpha: number): PreFarSpec0 {
	switch (ground_kind) {
	case Gr.GroundKind.regular: {
	    return {
		resource_name: "bg/ma_far.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.cbm: {
	    return {
		resource_name: "bg/ma_cbm3.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    };
	}
	case Gr.GroundKind.zx: {
	    return {
		resource_name: "bg/ma_zx.png",
		type: Gr.BgFarType.mountain,
		alpha: alpha
	    }
	}
	}
    }

    far_spec0_mk(ground_kind: Gr.GroundKind): FarSpec0[] {
	const cbm = ground_kind === Gr.GroundKind.cbm;
	// todo: extract out the x calculations,
	// make something more interesting,
	// make it so the world can fit more far's
	// w/out getting too large.
	const alpha = 0.2;
	const pre_far_spec0: PreFarSpec0[] = [
	    this.far_spec0_mk_left(ground_kind, alpha),
	    this.far_spec0_mk_middle(ground_kind, alpha),
	    this.far_spec0_mk_right(ground_kind, alpha),
	    this.far_spec0_mk_empty(ground_kind, alpha),
	];
	return pre_far_spec0.map((f: PreFarSpec0, i: number): FarSpec0 => {
	    return { ...f, x: K.BG_FAR_BG_SIZE.x * i }
	});
    }

    private init_adv_from_konfig(konfig: U.O<LevelEnemyKonfig>, fighter_kind: string): U.O<Eag.EnemyGeneratorSpec> {
	if (U.exists(konfig)) {
	    return {
		fighter_kind: fighter_kind,
		comment: `enemy-gen-${fighter_kind}`,
		generations: konfig?.count,
		max_alive: konfig?.limit,
		delay_msec: konfig?.delay_msec,
		tick_msec: konfig?.tick_msec,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    return konfig?.mk(db);
		}
	    }
	}
    }
    private init_basic_from_konfig(konfig: U.O<LevelEnemyKonfig>, fighter_kind: string): U.O<Ebg.EnemyGeneratorSpec> {
	if (U.exists(konfig)) {
	    return {
		fighter_kind: fighter_kind,
		comment: `enemy-gen-${fighter_kind}`,
		generations: konfig?.count,
		max_alive: konfig?.limit,
		delay_msec: konfig?.delay_msec,
		tick_msec: konfig?.tick_msec,
		warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		    return konfig?.mk(db);
		}
	    }
	}
    }

    private init_enemies(db: GDB.GameDB) {
	// note: i don't have nor am ever likely to implement a
	// general solution that keeps track of all the #'s and types
	// of enemies generated & defeated so that these generators
	// can query those values and react accordingly. no, no, instead
	// this is going to be a crappy half-hard-coded state machine hack.

	const spec: Eag.AddGeneratorsSpec = {}
	// @ts-ignore-error eyeroll
	if (K.DEBUG_HACK_ONLY_HYPERMEGA !== true) {
	    spec.pod = this.init_adv_from_konfig(this.konfig.Ep, "pod");
	    spec.small = this.init_adv_from_konfig(this.konfig.Es, "small");
	    spec.mega = this.init_adv_from_konfig(this.konfig.Em, "mega");
	}
	spec.hypermega = this.init_adv_from_konfig(this.konfig.Ehm, "hypermega");
	Eag.add_generators(db, spec);

	const basics: U.O<Ebg.EnemyGeneratorSpec>[] = [];
	// @ts-ignore-error eyeroll
	if (K.DEBUG_HACK_ONLY_HYPERMEGA !== true) {
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb1, "basic1"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb2, "basic2"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb3, "basic3"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb4, "basic4"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb5, "basic5"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb6, "basic6"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb7, "basic7"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Eb8, "basic8"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Ebs1, "basic-special-1"));
	    basics.push(this.init_basic_from_konfig(this.konfig.Ebs2, "basic-special-2"));
	    D.assert(basics.length > 0, "no basic enemies found?!");
	}
	Ebg.add_generators(
	    db,
	    basics.filter(b => U.exists(b)) as Ebg.EnemyGeneratorSpec[]
	);
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
	// match: client.
	const cdbg = next.local.client_db.debugging_state;
	const is_debugging = cdbg.is_drawing || cdbg.is_stepping || cdbg.is_annotating;
	if (is_debugging && next.local.client_db.inputs.commands[Cmd.CommandType.debug_win_level]) {
	    this.state = Gs.StepperState.completed;
	    return;
	}
	if (is_debugging && next.local.client_db.inputs.commands[Cmd.CommandType.debug_lose_level]) {
	    this.state = Gs.StepperState.lost;
	    return;
	}
	if (is_debugging && next.local.client_db.inputs.commands[Cmd.CommandType.debug_smite]) {
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
		this.state = this.get_is_player_dying(next) ? Gs.StepperState.running : Gs.StepperState.lost;
		return;
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
		lb: G.v2d_mk(K.GAMEPORT_RECT.size.x * 0.4, K.GAMEPORT_RECT.size.y/2),
		font: RESCUE_FONT,
		fillStyle: this.reminder_cycle.next().setAlpha01(
		    U.t01(0, K.PEOPLE_REMINDER_TIMEOUT, this.people_reminder_timeout)
		),
		text: "GO RESCUE!",
		comment: "save-people-reminder",
	    };
	    next.shared.hud_drawing.texts.push(reminder);
	    this.people_reminder_timeout -= K.FRAME_MSEC_DT; // todo: the whole DT things is poorly implemented.
	}
    }

    private sharedCore_mk(world_size: G.V2D, lives: number): GDB.DBSharedCore {
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
	    player_lives: lives,
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

    private uncloned_mk(dbc: GDB.DBSharedCore, index1: number, world_size: G.V2D, player_kind: S.PlayerKind): any {
	const player_size = Pl.get_player_size(player_kind);
	const collision_spacey_pad = player_size.y * 5; // match: empirical player constraints.
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
		debugging_state: { is_stepping: false, is_drawing: false, is_annotating: false },
	    },
	    // normally NOT ok to use just {} for prev_db, but prev_db gets auto set up by the abstract base class.
	    prev_db: {} as GDB.GameDB,
	    frame_dt: 0,
	    fps_marker: { tick: 0, msec: 0 },
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
		player_explosions: {},
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
