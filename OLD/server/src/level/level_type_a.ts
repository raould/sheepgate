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
import * as Sc from '../scoring';
import * as Hs from '../high_scores';
import * as U from '../util/util';
import * as D from '../debug';
import { RGBA } from '../color';
import { DebugGraphics } from '../debug_graphics';
import * as _ from 'lodash';

export type warpin_mk = (db: GDB.GameDB) => U.O<S.Sprite>;

export interface LevelKonfig {
    Eb1: Lemk.EnemyMk,
    ENEMY_BASIC1_COUNT: number,
    ENEMY_BASIC1_SPAWN_COUNT_LIMIT: number,

    Eb2: Lemk.EnemyMk,
    ENEMY_BASIC2_COUNT: number,
    ENEMY_BASIC2_SPAWN_COUNT_LIMIT: number,

    Es: Lemk.EnemyMk,
    ENEMY_SMALL_COUNT: number,
    ENEMY_SMALL_SPAWN_COUNT_LIMIT: number,

    Em: Lemk.EnemyMk,
    ENEMY_MEGA_COUNT: number,
    ENEMY_MEGA_SPAWN_COUNT_LIMIT: number,

    Ehm: Lemk.EnemyMk,
    ENEMY_HYPERMEGA_COUNT: number,
    ENEMY_HYPERMEGA_SPAWN_COUNT_LIMIT: number,

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

    get_state(): Gs.StepperState { return this.state; }
    get_scoring(): Sc.Scoring { return this.db.local.scoring; }

    constructor(public readonly index1: number, private readonly konfig: LevelKonfig, score: number, high_score: Hs.HighScore) {
	super(high_score);
	D.log(`new level_type_a for index1 ${index1}!`);
	this.state = Gs.StepperState.running;
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
	
	this.db.shared.items.sfx.push({ id: K.BEGIN_SFX });
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
	const lt = G.v2d_sub(
	    this.db.shared.items.base.lt,
	    G.v2d_mk_0y(200)
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
	Po.populate(this.db, this.konfig.people_cluster_count);
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
	const small_spec = {
	    comment: "enemy-gen-small",
	    generations: this.konfig.ENEMY_SMALL_COUNT,
	    max_alive: this.konfig.ENEMY_SMALL_SPAWN_COUNT_LIMIT,
	    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		db.shared.items.sfx.push({ id: K.WARPIN_SFX, gain: 0.5 });
		return this.konfig.Es.warpin_mk(db);
	    }
	}
	const mega_spec = {
	    comment: "enemy-gen-mega",
	    generations: this.konfig.ENEMY_MEGA_COUNT,
	    max_alive: this.konfig.ENEMY_MEGA_SPAWN_COUNT_LIMIT,
	    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		db.shared.items.sfx.push({ id: K.WARPIN_SFX, gain: 0.5 });
		return this.konfig.Em.warpin_mk(db);
	    }
	}
	const hypermega_spec = {
	    comment: "enemy-gen-hypermega",
	    generations: this.konfig.ENEMY_HYPERMEGA_COUNT,
	    max_alive: this.konfig.ENEMY_HYPERMEGA_SPAWN_COUNT_LIMIT,
	    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		db.shared.items.sfx.push({ id: K.WARPIN_SFX, gain: 0.5 });
		return this.konfig.Ehm.warpin_mk(db);
	    }
	}
	Eag.add_generators(this.db, small_spec, mega_spec, hypermega_spec);

	const basic1_spec = {
	    comment: "enemy-gen-basic1",
	    generations: this.konfig.ENEMY_BASIC1_COUNT,
	    max_alive: this.konfig.ENEMY_BASIC1_SPAWN_COUNT_LIMIT,
	    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		db.shared.items.sfx.push({ id: K.WARPIN_SFX, gain: 0.5 });
		return this.konfig.Eb1.warpin_mk(db);
	    }
	};
	const basic2_spec = {
	    comment: "enemy-gen-basic2",
	    generations: this.konfig.ENEMY_BASIC2_COUNT,
	    max_alive: this.konfig.ENEMY_BASIC2_SPAWN_COUNT_LIMIT,
	    warpin: (db: GDB.GameDB): U.O<S.Warpin> => {
		db.shared.items.sfx.push({ id: K.WARPIN_SFX, gain: 0.5 });
		return this.konfig.Eb2.warpin_mk(db);
	    }
	};
	Ebg.add_generators(this.db, [basic1_spec, basic2_spec]);
    }

    update_impl(next: GDB.GameDB) {
	if (!!next.local.client_db.inputs.commands[Cmd.CommandType.debug_win_level]) {
	    this.state = Gs.StepperState.completed;
	    return;
	}
	if (!!next.local.client_db.inputs.commands[Cmd.CommandType.debug_lose_level]) {
	    this.state = Gs.StepperState.lost;
	    return;
	}
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
	    else if (U.count_dict(next.local.enemy_generators) == 0 &&
		     U.count_dict(next.shared.items.warpin) == 0 &&
		     U.count_dict(next.shared.items.enemies) == 0 &&
		     U.count_dict(next.shared.items.explosions) == 0) {
		// once people are either rescued or dead, they won't show up in this count.
		let waiting_count =
		    (GDB.get_player(next)?.passenger_ids.size ?? 0) +
		    (GDB.get_player(next)?.beaming_ids.size ?? 0) +
		    U.count_dict(next.shared.items.people);
		if (waiting_count == 0) {
		    this.state = next.shared.rescued_count == 0 ? Gs.StepperState.lost : Gs.StepperState.completed;
		    return;
		}
	    }
	}
    }

    private sharedCore_mk(world_size: G.V2D): GDB.DBSharedCore {
	// *** warning: note that all of shared round-trips with the client! ***
	const ground_y = world_size.y - K.GROUND_SIZE.y;
	const shared: GDB.DBSharedCore = {
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
			// todo: i wish i understood the use of world_bounds.
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
	    rescued_count: 0,
	    debug_graphics: DebugGraphics.get_graphics(),
	    hud_drawing: Dr.drawing_mk(),
	    frame_drawing: Dr.drawing_mk(),
	    permanent_bg_drawing: Dr.drawing_mk(),
	    permanent_fg_drawing: Dr.drawing_mk(),
	};
	return shared;
    }

    private uncloned_mk(dbc: GDB.DBSharedCore, index1: number, world_size: G.V2D): any {
	const collision_spacey_pad = K.PLAYER_SIZE.y * 5; // match: empirical player constraints.
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
	    [Sc.Event.gem_pickup, 10],
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
	    people_beamed_up: 0,
	    people_rescued: 0,
	    state_modifiers: [],
	    ticking_generators: {},
	    enemy_generators: {},
	    player_zone_width: K.GAMEPORT_PLAYER_ZONE_WIDTH,
	    scoring: Sc.scoring_mk(score, e2s),
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
		warpin: {},
		enemies: {},
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
		sfx: [],
		particles: {},
	    }
	};
	return dbs;
    }
}
