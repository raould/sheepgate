/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Is from './menu/instructions_screen';
import * as Ps from './menu/plain_screen';
import * as Hse from './menu/high_score_entry_screen';
import * as Hst from './menu/high_score_table_screen';
import * as Cdb from './client_db';
import * as Db from './db';
import * as Cmd from './commands';
import * as Gs from './game_stepper';
import * as Hs from './high_scores';
import * as U from './util/util';
import * as G from './geom';
import * as D from './debug';
import * as K from './konfig';
import * as Rnd from './random';
import * as Lis from './level/level_in_screens';
import { RGBA } from './color';
// well, this sucks.
import * as La from './level/attract/attract';
import * as L1 from './level/level1/level1';
import * as L2 from './level/level2/level2';
import * as L3 from './level/level3/level3';
import * as L4 from './level/level4/level4';
import * as L5 from './level/level5/level5';
import * as L6 from './level/level6/level6';
import * as L7 from './level/level7/level7';

const TRACK1_SFX = { sfx_id: K.TRACK1_SFX, gain: 0.3, singleton: true };

// the leading blank lines are a hack, yes :-(
const WARNING_INSTRUCTIONS = [
    " ",
    " ",
    "========= THIS GAME HAS FLASHING EFFECTS =========",
    "Photosensitivity - epilepsy - seizures: a very small",
    "percentage of individuals may experience",
    "epileptic seizures or blackouts when exposed to",
    "certain light patterns or flashing lights.",
];

// the leading blank lines are a hack, yes :-(
const MAIN_INSTRUCTIONS = [
    "RETURN CREATURES TO BASE.",
    "DEFEAT ALL ENEMIES.",
    " ",
    " ",
    "MOVE: WASD - ARROWS - VI",
    "FIRE: SPACE - Z - ENTER",
    "PAUSE: ESC - P",
];

export interface Game {
    merge_client_db(cnew: Cdb.ClientDB): void;
    step(): void;
    get_db(): Db.DB<Db.World>;
    stringify(): string;
}

interface GamePrivate extends Game {
    stepper: Gs.Stepper;
}

type LevelMk = (level_index: number, score: number, high_score: Hs.HighScore) => Lis.LevelInScreens;
// match: konfig.ts
const level_mks: LevelMk[] = [
    (i: number, score: number, hi: Hs.HighScore) => L1.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L2.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L3.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L4.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L5.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L6.level_mk(i, score, hi),
    (i: number, score: number, hi: Hs.HighScore) => L7.level_mk(i, score, hi),
];
D.assert(level_mks.length === K.LEVEL_TEMPLATE_COUNT, "level template count");

export function game_mk(high_scores: Hs.HighScores): Game {
    return new class _G implements GamePrivate {
        stepper: Gs.Stepper;

        constructor() {
            D.log("new game!");
            this.stepper = K.ARCADE_MODE ? new GameAttract() : new GameWarning();
        }

        merge_client_db(cnew: Cdb.ClientDB) {
            this.stepper.merge_client_db(cnew);
	    if (cnew.storage_json != undefined) {
		D.log("storage_json", cnew.storage_json);
		high_scores.set_scores_from_json(cnew.storage_json);
	    }
        }

        // todo: this would all be better done as a state machine / graph type of thing.
	step() {
            this.stepper.step();
	    if (this.stepper instanceof GameAttract && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameInstructions("HOW TO PLAY");
	    }
            else if (this.stepper instanceof GameWarning && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameInstructions("HOW TO PLAY");
	    }
            else if (this.stepper instanceof GameInstructions && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameLevels(high_scores.get_high_score());
            }
            else if (this.stepper instanceof GameLevels && this.stepper.get_state() != Gs.StepperState.running) {
                const score = (this.stepper as GameLevels).get_score();
                if (high_scores.is_high_score(score)) {
                    this.stepper = new GameHighScoreEntry(score, high_scores);
                }
                else {
                    this.stepper = new GameHighScoreTable(high_scores, false);
                }
            }
            else if (this.stepper instanceof GameHighScoreEntry && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameHighScoreTable(high_scores, true);
            }
	    else if (this.stepper instanceof GameHighScoreTable && this.stepper.get_state() != Gs.StepperState.running) {
		this.stepper = new GameWarning();
	    }
        }

	get_db(): Db.DB<Db.World> {
	    return this.stepper.get_db();
	}

        stringify(): string {
            return this.stepper.stringify();
        }
    }
}

class GameAttract implements Gs.Stepper {
    stepper: Gs.Stepper;
    exit: boolean;

    constructor() {
        this.stepper = La.level_mk();
	this.exit = false;
    }

    get_state(): Gs.StepperState {
        return this.exit ? Gs.StepperState.completed : this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
	if (Object.keys(cnew.inputs.commands).length > 0) {
	    this.exit = true;
	} 
        this.stepper.merge_client_db(cnew);
    }

    step() {
        this.stepper.step();
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameWarning implements Gs.Stepper {
    stepper: Ps.PlainScreen;

    constructor() {
        this.stepper = new Ps.PlainScreen({
	    title: "WARNING",
	    skip_text: "CONTINUE: SPACE - Z - ENTER",
	    instructions: WARNING_INSTRUCTIONS,
	    instructions_size: K.d2si(40),
	    fg_color: RGBA.WHITE,
	    bg_color: RGBA.DARK_MAGENTA,
	});
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
    }

    step() {
        this.stepper.step();
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameInstructions implements Gs.Stepper {
    stepper: Is.InstructionsScreen;
    last: number;
    qr: any;
    
    constructor(title: string) {
        this.stepper = new Is.InstructionsScreen({
	    title,
	    instructions: MAIN_INSTRUCTIONS,
	    size: K.d2si(35),
	    animated: true,
	    bg_color: RGBA.DARK_BLUE,
	    top_offset_y: K.d2si(40),
	});
	this.stepper.mdb.shared.sfx.push({ sfx_id: K.SYNTH_C_SFX });
	this.qr = {
            wrap: false,
            image_located: {
                resource_id: "images/qr.png",
                rect: G.rect_mk(
		    G.v2d_mk(
			G.rect_w(K.SCREEN_RECT)*0.9,
			G.rect_h(K.SCREEN_RECT)*0.81
		    ),
		    K.vd2si(G.v2d_mk(60, 60)),
		),
            },
	    comment: "qr",
	};
	this.last = Date.now();
    }

    player_mk() {
	const x = G.rect_w(K.SCREEN_RECT)*0.1;
	const y = G.rect_h(K.SCREEN_RECT)*0.2;
	const yo = Math.sin((this.stepper.mdb.shared.tick + x)/40) * K.d2s(5);
	return {
            wrap: false,
            image_located: {
                resource_id: "images/player/cowR.png",
                rect: G.rect_mk(
		    G.v2d_mk(x, y + yo),
		    K.PLAYER_COW_SIZE,
		),
            },
	    comment: "player",
	};
    }

    enemy_mk() {
	const x = G.rect_w(K.SCREEN_RECT)*0.85;
	const y = G.rect_h(K.SCREEN_RECT)*0.2;
	const yo = Math.sin((this.stepper.mdb.shared.tick + x)/20) * K.d2s(5);
	return {
            wrap: false,
            image_located: {
                resource_id: "images/enemies/basic1/sph1.png",
                rect: G.rect_mk(
		    G.v2d_mk(x, y + yo),
		    K.vd2s(G.v2d_mk(28, 28)),
		),
            },
	    comment: "player",
	};
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
    }

    step() {
        this.stepper.step();
	// reaching into mdb like this is gross, yes.
        this.stepper.mdb.shared.frame_drawing.images.push(this.qr);
        this.stepper.mdb.shared.frame_drawing.images.push(this.player_mk());
        this.stepper.mdb.shared.frame_drawing.images.push(this.enemy_mk());
	this.stepper.mdb.shared.sfx.push(TRACK1_SFX);
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameHighScoreEntry implements Gs.Stepper {
    stepper: Gs.Stepper;

    constructor(private score: number, private high_scores: Hs.HighScores) {
        this.stepper = new Hse.HighScoreEntryScreen(score);
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
    }

    step() {
        this.stepper.step();
        if (this.stepper instanceof Hse.HighScoreEntryScreen && this.stepper.get_state() != Gs.StepperState.running) {
            const high_score = (this.stepper as Hse.HighScoreEntryScreen).get_entry();
            this.high_scores.maybe_add_score(high_score);
        }
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameHighScoreTable implements Gs.Stepper {
    stepper: Gs.Stepper;

    constructor(private high_scores: Hs.HighScores, emit_table: boolean) {
        this.stepper = new Hst.HighScoreTableScreen(high_scores, emit_table);
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
    }

    step() {
        this.stepper.step();
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameLevels implements Gs.Stepper {
    index: number;
    stepper: Gs.Stepper;
    paused: U.O<Gs.Stepper>;
    
    constructor(private readonly high_score: Hs.HighScore) {
        this.index = 0; // hard to grep find this when you don't know.
        this.stepper = U.element_looped(level_mks, this.index)!(this.index+1, 0, this.high_score);
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    get_score(): number {
        D.assert(!this.paused); // not sure why any more.
        return (this.stepper as Lis.LevelInScreens).level.get_scoring().score;
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
        if (!!cnew.inputs.commands[Cmd.CommandType.pause]) {
            if (!!this.paused) {
                this.stepper = this.paused;
                this.paused = undefined;
            }
            else {
                this.paused = this.stepper;
                this.stepper = new GameInstructions("PAUSED");
            }
        }
    }

    // todo: this would all be better done as a visual graph / state machine.
    step() {
        this.stepper.step();
        if (this.stepper.get_state() == Gs.StepperState.completed) {
            if (!!this.paused) {
                this.stepper = this.paused;
                this.paused = undefined;
            }
            else {
                this.index++;
                // todo: maybe pull the score fully out so internally levels always start at score=0.
                // it would mean the rendering for the score would have to also be changed.
                const score = (this.stepper as Lis.LevelInScreens).level.get_scoring().score;
                this.stepper = U.element_looped(level_mks, this.index)!(this.index+1, score, this.high_score);
            }
        }
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}
