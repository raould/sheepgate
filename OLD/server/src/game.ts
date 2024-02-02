import * as Is from './menu/instructions_screen';
import * as Hse from './menu/high_score_entry_screen';
import * as Hst from './menu/high_score_table_screen';
import * as Lis from './level/level_in_screens';
import * as L1 from './level/level1/level1';
import * as L2 from './level/level2/level2';
import * as L3 from './level/level3/level3';
import * as Cdb from './client_db';
import * as Cmd from './commands';
import * as Gs from './game_stepper';
import * as Hs from './high_scores';
import * as U from './util/util';
import * as D from './debug';

export interface Game {
    merge_client_db(cnew: Cdb.ClientDB): void;
    // 'step' here assumes that the correct 'dt' fps time has
    // passed, it doesn't try to check the real/world time.
    step(): void;
    stringify(): string;
}

interface GamePrivate extends Game {
    stepper: Gs.Stepper;
}

type LevelMk = (score: number, high_score: Hs.HighScore) => Lis.LevelInScreens;
const level_mks: LevelMk[] = [
    (level_index: number, score: number, high_score: Hs.HighScore) => L1.level_mk(level_index, score, high_score),
    (level_index: number, score: number, high_score: Hs.HighScore) => L2.level_mk(level_index, score, high_score),
    (level_index: number, score: number, high_score: Hs.HighScore) => L3.level_mk(level_index, score, high_score),
];

export function game_mk(high_scores: Hs.HighScores): Game {
    return new class _G implements GamePrivate {
        stepper: Gs.Stepper;

        constructor() {
            D.log("new game!");
            this.stepper = new GameInstructions();
        }

        merge_client_db(cnew: Cdb.ClientDB) {
            this.stepper.merge_client_db(cnew);
        }

        // todo: this would all be better done as a visual graph / state machine.
        step() {
            this.stepper.step();
            if (this.stepper instanceof GameInstructions && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameLevels(high_scores.get_high_score());
            }
            else if (this.stepper instanceof GameLevels && this.stepper.get_state() != Gs.StepperState.running) {
                const score = (this.stepper as GameLevels).get_score();
                if (high_scores.is_high_score(score)) {
                    this.stepper = new GameHighScoreEntry(score, high_scores);
                }
                else {
                    this.stepper = new GameInstructions();
                }
            }
            else if (this.stepper instanceof GameHighScoreEntry && this.stepper.get_state() != Gs.StepperState.running) {
                this.stepper = new GameInstructions();
            }
        }

        stringify(): string {
            return this.stepper.stringify();
        }
    }
}

class GameInstructions implements Gs.Stepper {
    stepper: Gs.Stepper;

    constructor(animated: boolean = true) {
        this.stepper = new Is.InstructionsScreen(Is.TOP_INSTRUCTIONS, animated);
        // this.stepper = new Hst.HighScoreTableScreen(Hs.high_scores_mk()); // just for testing it easily.
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

class GameLevelPaused implements Gs.Stepper {
    stepper: Gs.Stepper;

    constructor() {
        this.stepper = new Hst.HighScoreTableScreen(Hs.high_scores_mk()); // just for testing.
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB) {
        this.stepper.merge_client_db(cnew);
    }

    // todo: this would all be better done as a visual graph / state machine.
    step() {
        this.stepper.step();
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
        this.index = 0;
        this.stepper = U.element_looped(level_mks, this.index)!(this.index+1, 0, this.high_score);
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    get_score(): number {
        D.assert(!this.paused);
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
                this.stepper = new GameInstructions(false);
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
