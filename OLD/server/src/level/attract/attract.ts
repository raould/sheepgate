/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import { RGBA } from '../../color';
import * as K from '../../konfig';
import * as S from '../../sprite';
import * as Lta from '../level_type_a';
import * as Lis from '../level_in_screens';
import * as U from '../../util/util';
import * as Cmd from '../../commands';
import * as Rnd from '../../random';
import * as G from '../../geom';
import * as Cdb from '../../client_db';
import * as GDB from '../../game_db';
import * as Gs from '../../game_stepper';
import Eb1 from '../../enemy/enemy_basic1';
import Es from './enemy_small1';
import Em from './enemy_mega1';
import Ehm from './enemy_hypermega1';
import * as Hs from '../../high_scores';

// todo: move 'L' things from konfig to here.
const LKfn = (level_index: number): Lta.LevelKonfig => {
    return {
	Eb1: { mk: Eb1.warpin_mk, count: Number.MAX_SAFE_INTEGER, limit: 10, delay_msec: 1000, tick_msec: 1*1000 },
	Es: { mk: Es.warpin_mk, count: Number.MAX_SAFE_INTEGER, limit: 3, delay_msec: 1000, tick_msec: 5*1000 },
	BG_COLOR: RGBA.new01(0, 0, 0.05),
	people_cluster_count: 1,
    };
};

class LevelImpl extends Lta.AbstractLevelTypeA {
    small_snapshot: S.ImageSized;
    mega_snapshot: S.ImageSized;
    hypermega_snapshot: S.ImageSized;
    exit: boolean = false;

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
	if(Object.keys(cnew.inputs.keys).length > 0) {
	    this.exit = true;
	}
    }

    step() {
	super.step();

	// commands here vs. merge_client_db() because that only gets called when there is actual input from the client.
	this.db.local.client_db.inputs.commands[Cmd.CommandType.thrust] = Rnd.singleton.boolean(0.6);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.right] = Rnd.singleton.boolean(0.003);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.left] = Rnd.singleton.boolean(0.003);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.up] = Rnd.singleton.boolean(0.5);
	this.db.local.client_db.inputs.commands[Cmd.CommandType.down] = Rnd.singleton.boolean(0.5);
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
	    lb: G.v2d_mk(K.GAMEPORT_RECT.size.x * 0.36, K.GAMEPORT_RECT.size.y * 0.5),
	    font: `${K.d2si(80)}px ${K.MENU_FONT}`,
	    text: "SHEEPGATE",
	    comment: "demo-title",
	});
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
