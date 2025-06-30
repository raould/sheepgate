/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import { RGBA } from '../../color';
import * as K from '../../konfig';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as U from '../../util/util';
import * as Cmd from '../../commands';
import * as Rnd from '../../random';
import * as G from '../../geom';
import * as Cdb from '../../client_db';
import * as GDB from '../../game_db';
import * as Gs from '../../game_stepper';
import * as Gr from '../../ground';
import Eb1 from '../../enemy/enemy_basic1';
import Es from './enemy_small1';
import Em from './enemy_mega1';
import Ehm from './enemy_hypermega1';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    return {
	player_kind: S.PlayerKind.cow,
	player_disable_beaming: true,
	ground_kind: Gr.GroundKind.regular,
	Eb1: { mk: Eb1.warpin_mk, count: Number.MAX_SAFE_INTEGER, limit: 4, delay_msec: 1000, tick_msec: 1*1000 },
	Es: { mk: Es.warpin_mk, count: Number.MAX_SAFE_INTEGER, limit: 3, delay_msec: 1000, tick_msec: 5*1000 },
	BG_COLOR: RGBA.new01(0, 0, 0.05),
	people_cluster_count: 1,
    };
};

const ATTRACT_MOVES = [Cmd.CommandType.up, Cmd.CommandType.down, undefined];
const LEET = "5 H 3 3 P G A T 3";
const SHEEP = "S H E E P G A T E";
const titleLatch = new Rnd.RandomBoolDuration(0.1, 1000, 7*1000);

class LevelImpl extends Lta.AbstractLevelTypeA {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;
    exit: boolean = false;
    moves: Cmd.CommandType[] = [];

    constructor(readonly index1: number, konfig: Lta.LevelKonfig, score: number, high_score: Hs.HighScore) {
	super(index1, konfig, score, high_score);
	const images = this.db.uncloned.images;
	this.small_snapshot = {
	    size: Es.SIZE,
	    resource_id: images.lookup(Es.WARPIN_RESOURCE_ID)
	};
	this.mega_snapshot = {
	    size: Em.SIZE,
	    resource_id: images.lookup(Em.WARPIN_RESOURCE_ID)
	};
	this.hypermega_snapshot = {
	    size: Ehm.SIZE,
	    resource_id: images.lookup(Ehm.WARPIN_RESOURCE_ID)
	};
    }

    update_impl(next: GDB.GameDB) {
	super.update_impl(next);
	if (this.exit) {
	    this.state = Gs.StepperState.completed;	    
	}
    }

    merge_client_db(cnew: Cdb.ClientDB) {
	super.merge_client_db(cnew);
	if (Object.keys(cnew.inputs.keys).length > 0) {
	    this.exit = true;
	}
	if (cnew.inputs.commands[Cmd.CommandType.click]) {
	    this.exit = true;
	}
    }

    step() {
	super.step();

	// commands here vs. merge_client_db() because that only gets called when there is actual input from the client.
	if (this.moves.length === 0) {
	    this.db.local.client_db.inputs.commands[Cmd.CommandType.up] = false;
	    this.db.local.client_db.inputs.commands[Cmd.CommandType.down] = false;
	    const cmd = Rnd.singleton.array_item(ATTRACT_MOVES);
	    const count = Rnd.singleton.int_range(5, 20);
	    this.moves.push(...Array(count).fill(cmd));
	}
	if (this.moves.length > 0) {
	    const cmd = this.moves.pop();
	    if (U.exists(cmd)) { this.db.local.client_db.inputs.commands[cmd] = true; }
	}
	this.db.local.client_db.inputs.commands[Cmd.CommandType.thrust] = Rnd.singleton.boolean(0.8);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.right] = Rnd.singleton.boolean(0.003);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.left] = Rnd.singleton.boolean(0.003);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.fire] = Rnd.singleton.boolean(0.1);

	const p = GDB.get_player(this.db);
	const s = p && GDB.get_shield(this.db, p.shield_id);
	if (U.exists(s)) {
	    s.hp = s.hp_init;
	}
	const color = Math.floor(this.db.shared.sim_now / 2000) % 2 === 0 ? RGBA.YELLOW : RGBA.MAGENTA;
	this.db.shared.hud_drawing.texts.push({
	    wrap: true,
	    fillStyle: color,
	    lb: G.v2d_mk(K.GAMEPORT_RECT.size.x * 0.4, K.GAMEPORT_RECT.size.y * 0.6),
	    font: `${K.d2si(20)}px ${K.MENU_FONT}`,
	    text: "PRESS ANY BUTTON TO PLAY!",
	    comment: "demo-instructions",
	});
	this.db.shared.hud_drawing.texts.push({
	    wrap: true,
	    fillStyle: RGBA.CYAN,
	    lb: G.v2d_mk(K.GAMEPORT_RECT.size.x * 0.24, K.GAMEPORT_RECT.size.y * 0.5),
	    font: `${K.d2si(80)}px ${K.MENU_FONT}`,
	    text: titleLatch.test(this.db.shared.sim_now) ? LEET : SHEEP,
	    comment: "demo-title",
	});

	// browser security means no sounds play during attract.
	// don't let them build up and overflow to the instructions page.
	this.db.shared.sfx = [];
    }
}

export function level_mk(): LevelImpl {
    const LK = LKfn(1);
    const level = new LevelImpl(
	1,
	LK,
	0,
	new Hs.HighScore("DEMO", 1)
    );
    return level;
}
