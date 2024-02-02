import * as Gs from '../game_stepper';
import * as Cdb from '../client_db';
import * as M from '../menu/menu';
import * as Lss from '../menu/level_start_screen';
import * as Les from '../menu/level_end_screen';
import * as Lv from './level';
import { RGBA } from '../color';
import * as U from '../util/util';

interface SubState extends Gs.Stepper {
    get_next_state(): U.O<SubState>;
}

const LOST_COLOR = RGBA.lerpRGBA(RGBA.RED, RGBA.BLACK, 0.7);

// todo: change this to use the State Pattern.
export class LevelInScreens implements Gs.Stepper {
    stepper: SubState;

    constructor(private readonly index1: number, public readonly level: Lv.Level) {
        this.stepper = new LevelWithScreen_StartScreen(index1, level);
    }

    get_state(): Gs.StepperState {
        return this.stepper.get_state();
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.stepper.merge_client_db(cnew);
    }

    step(): void {
        this.stepper.step();
        if (this.stepper.get_state() != Gs.StepperState.running) {
            this.stepper = this.stepper.get_next_state() || this.stepper;
        }
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class LevelWithScreen_StartScreen implements SubState {
    start_screen: M.Menu;
    next_state: SubState;

    constructor(private readonly index1: number, private readonly level: Lv.Level) {
        const small = level.small_snapshot;
        const mega = level.mega_snapshot;
        const hypermega = level.hypermega_snapshot;
        this.start_screen = new Lss.LevelStartScreen(
            `LEVEL ${index1} START!`,
            `PRESS [FIRE] TO LAUNCH`,
            small,
            mega,
            hypermega,
            RGBA.BLACK
        );
        this.next_state = new LevelWithScreen_Level(index1, level);
    }

    get_state(): Gs.StepperState {
        return this.start_screen.get_state();
    }

    get_next_state(): U.O<SubState> {
        return this.next_state;
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.start_screen.merge_client_db(cnew);
    }

    step(): void {
        this.start_screen.step();
    }

    stringify(): string {
        return this.start_screen.stringify();
    }
}

class LevelWithScreen_EndScreen implements SubState {
    end_screen: M.Menu;

    constructor(index1: number, private readonly final_state: Gs.StepperState) {
        const won = final_state == Gs.StepperState.completed;
        this.end_screen = new Les.LevelEndScreen(
            `LEVEL ${index1} ${won ? "WON!" : "LOST!"}`,
            `PRESS [FIRE] TO CONTINUE`,
            won ? RGBA.BLACK : LOST_COLOR
        );
    }

    get_state(): Gs.StepperState {
        const screen_state = this.end_screen.get_state();
        if (screen_state == Gs.StepperState.running) {
            return screen_state;
        }
        else {
            return this.final_state;
        }
    }

    get_next_state(): U.O<SubState> {
        return undefined;
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.end_screen.merge_client_db(cnew);
    }

    step(): void {
        this.end_screen.step();
    }

    stringify(): string {
        return this.end_screen.stringify();
    }
}

class LevelWithScreen_Level implements SubState {
    next_state: U.O<SubState>;

    constructor(private readonly index1: number, private readonly level: Lv.Level) {
    }

    get_state(): Gs.StepperState {
        return this.level.get_state();
    }

    get_next_state(): U.O<SubState> {
        if (this.next_state == null) {
            this.next_state = new LevelWithScreen_EndScreen(
                this.index1,
                this.level.get_state()
            );
        }
        return this.next_state;
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.level.merge_client_db(cnew);
    }

    step(): void {
        this.level.step();
    }

    stringify(): string {
        return this.level.stringify();
    }
}