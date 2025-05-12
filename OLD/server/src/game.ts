import * as Is from './menu/instructions_screen';
import * as Ps from './menu/plain_screen';
import * as Hse from './menu/high_score_entry_screen';
import * as Hst from './menu/high_score_table_screen';
import * as Cdb from './client_db';
import * as Cmd from './commands';
import * as Gs from './game_stepper';
import * as Hs from './high_scores';
import * as U from './util/util';
import * as D from './debug';
import * as K from './konfig';
import * as Rnd from './random';
import * as Lis from './level/level_in_screens';
import { RGBA } from './color';
// well, this sucks.
import * as L1 from './level/level1/level1';
import * as L2 from './level/level2/level2';
import * as L3 from './level/level3/level3';
import * as L4 from './level/level4/level4';

// the leading blank lines are a hack, yes :-(
const WARNING_INSTRUCTIONS = [
    " ",
    " ",
    "=== WARNING: THIS GAME HAS FLASHING EFFECTS ===",
    "Photosensitivity/epilepsy/seizures: a very small",
    "percentage of individuals may experience",
    "epileptic seizures or blackouts when exposed to",
    "certain light patterns or flashing lights.",
];

// the leading blank lines are a hack, yes :-(
const MAIN_INSTRUCTIONS = [
    " ",
    " ",
    "RETURN HUMANS TO BASE.",
    "DEFEAT ALL ENEMIES.",
    " ",
    "FIRE: SPACE / Z / ENTER",
    "MOVE: {W,A,S,D} / {ARROW KEYS}",
    "BOOST: SHIFT",
    "PAUSE: ESC",
];

export interface Game {
    merge_client_db(cnew: Cdb.ClientDB): void;
    step(): void;
    stringify(): string;
}

interface GamePrivate extends Game {
    stepper: Gs.Stepper;
}

type LevelMk = (level_index: number, score: number, high_score: Hs.HighScore) => Lis.LevelInScreens;
// match: konfig.ts
const level_mks: LevelMk[] = [
    (level_index: number, score: number, high_score: Hs.HighScore) => L1.level_mk(level_index, score, high_score),
    (level_index: number, score: number, high_score: Hs.HighScore) => L2.level_mk(level_index, score, high_score),
    (level_index: number, score: number, high_score: Hs.HighScore) => L3.level_mk(level_index, score, high_score),
    (level_index: number, score: number, high_score: Hs.HighScore) => L4.level_mk(level_index, score, high_score),
];
D.assert(level_mks.length === K.LEVEL_TEMPLATE_COUNT, "level template count");

export function game_mk(high_scores: Hs.HighScores): Game {
    return new class _G implements GamePrivate {
        stepper: Gs.Stepper;

        constructor() {
            D.log("new game!");
	    // todo: revert
            //this.stepper = new GameWarning();
            this.stepper = new GameHighScoreEntry(2, high_scores);
        }

        merge_client_db(cnew: Cdb.ClientDB) {
            this.stepper.merge_client_db(cnew);
        }

        // todo: this would all be better done as a state machine / graph type of thing.
	step() {
            this.stepper.step();
            if (this.stepper instanceof GameWarning && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameInstructions();
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
                    this.stepper = new GameWarning();
                }
            }
            else if (this.stepper instanceof GameHighScoreEntry && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameWarning();
            }
        }

        stringify(): string {
            return this.stepper.stringify();
        }
    }
}

class GameWarning implements Gs.Stepper {
    stepper: Gs.Stepper;

    constructor() {
        this.stepper = new Ps.PlainScreen({
	    title: "WARNING",
	    skip_text: "CONTINUE: SPACE / Z / ENTER",
	    instructions: WARNING_INSTRUCTIONS,
	    instructions_size: 30,
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

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GameInstructions implements Gs.Stepper {
    stepper: Is.InstructionsScreen;
    last: number;

    constructor(private readonly play_sfx: boolean = true) {
        this.stepper = new Is.InstructionsScreen({
	    title: "HOW TO PLAY",
	    instructions: MAIN_INSTRUCTIONS,
	    size: 35,
	    animated: true,
	    bg_color: RGBA.DARK_BLUE,
	});
	if (this.play_sfx) {
	    this.stepper.mdb.items.sfx.push({ sfx_id: K.SYNTH_C_SFX });
	}
	this.last = Date.now();
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

    stringify(): string {
        return this.stepper.stringify();
    }
}

class GamePaused extends GameInstructions implements Gs.Stepper {
    constructor() {
	super(false);
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
            this.stepper = new Hst.HighScoreTableScreen(this.high_scores);
        }
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
                this.stepper = new GamePaused();
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

    stringify(): string {
        return this.stepper.stringify();
    }
}
