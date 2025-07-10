/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as K from '../konfig';
import * as Gs from '../game_stepper';
import * as Cdb from '../client_db';
import * as Db from '../db';
import * as M from '../menu/menu';
import * as Lss from './level_start_screen';
import * as Les from './level_end_screen';
import * as Lv from './level';
import { RGBA } from '../color';
import * as U from '../util/util';
import * as Rnd from "../random";

interface SubState extends Gs.Stepper {
    get_next_substate(): SubState;
}

const LOST_COLOR = RGBA.lerpRGBA(RGBA.RED, RGBA.BLACK, 0.25);

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
        this.stepper = this.stepper.get_next_substate();
    }

    get_db(): Db.DB<Db.World> {
	return this.stepper.get_db();
    }

    stringify(): string {
        return this.stepper.stringify();
    }
}

class LevelWithScreen_StartScreen extends Lss.LevelStartScreen implements SubState {
    constructor(private readonly index1: number, private readonly level: Lv.Level) {
        super(
            `LEVEL ${index1} START!`,
	    K.USER_SKIP_TEXT,
            level.small_snapshot,
            level.mega_snapshot,
            level.hypermega_snapshot,
	    // todo: wish i could use the level's bg_color.
            RGBA.BLACK,
	    level.get_starting_fx(),
        );
    }

    get_next_substate(): SubState {
	if (this.get_state() == Gs.StepperState.running) {
	    return this;
	}
	else {
            return new LevelWithScreen_Level(this.index1, this.level);
	}
    }
}

class LevelWithScreen_EndScreen implements SubState {
    static WON_PHRASES = [
	"BULLY FOR YOU!",
	"GOOD ON YER!",
	"TAKE THAT!",
	"ZOWIE!",
	"WELL DONE!",
	"HIP HIP HOORAY!",
	"SALLY FORTH!",
	"ONWARD!",
	"DAMN THE TORPEDOES!",
	"SHAZBOT!",
	"SLICE AND DICE!",
	"BOVINE POWER!",
	"TWITCH MASTER!",
	"BRING IT!",
	"BROUGHT IT!",
	"SMACK DOWN!",
	"CURB STOMP!",
	"VICTORY!",
	"IT AIN'T OVER!",
    ];
    static LOST_PHRASES = [
	"USE THE SCANNER, LUKE!",
	"NICE TRY!",
	"INSERT COIN!",
	"WAH WAH WAAH!",
	"WELL, POOP!",
	"SHINOLA!",
	"SHAZBOT!",
	"SHEEOOT!",
	"MOVE ALONG!",
	"WEAK SAUCE!",
	"LAME!",
	"EXCREMENT!",
	"HA HA HUMANOID!",
	"100053R!",
	"YOU'RE DEAD, JIM!",
	"WHIMPER!",
	"LE GRAND MORT!",
    ];

    end_screen: Les.LevelEndScreen;

    constructor(index1: number, private readonly final_state: Gs.StepperState) {
        const won = final_state == Gs.StepperState.completed;
	const wonPhrase = index1 == 1 ?
	      "YOU ROCK!" :
	      Rnd.singleton.array_item(LevelWithScreen_EndScreen.WON_PHRASES) ?? "NICE!"
	const lostPhrase = index1 == 1 ?
	      "GAME OVER!" :
	      Rnd.singleton.array_item(LevelWithScreen_EndScreen.LOST_PHRASES) ?? "DAGNABBIT!"
        this.end_screen = new Les.LevelEndScreen({
            title: `LEVEL ${index1} ${won ? "WON!" : "LOST!"}`,
	    instructions: won ? [wonPhrase] : [lostPhrase],
	    size: K.d2si(80),
	    animated: true,
            bg_color: won ? RGBA.BLACK : LOST_COLOR,
        });
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

    get_next_substate(): SubState {
	return this;
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.end_screen.merge_client_db(cnew);
    }

    step(): void {
        this.end_screen.step();
    }

    get_db(): Db.DB<Db.World> {
	return this.end_screen.get_db();
    }

    stringify(): string {
        return this.end_screen.stringify();
    }
}

class LevelWithScreen_Level implements SubState {
    constructor(private readonly index1: number, private readonly level: Lv.Level) {
	level.db.shared.sfx.push({ sfx_id: K.BEGIN_SFX });
    }

    get_state(): Gs.StepperState {
        return this.level.get_state();
    }

    get_next_substate(): SubState {
	switch (this.get_state()) {
	case Gs.StepperState.running:
	    return this;
	case Gs.StepperState.completed:
	    return new LevelWithScreen_EndScreen(
		this.index1,
		this.level.get_state()
	    );
	case Gs.StepperState.lost:
	    if (this.level.db.shared.player_lives > 0) {
		this.level.lose_life();
		return new LevelWithScreen_StartScreen(
		    this.index1,
		    this.level
		);
	    } else {
		return new LevelWithScreen_EndScreen(
		    this.index1,
		    this.level.get_state()
		);
	    }
	}
    }

    merge_client_db(cnew: Cdb.ClientDB): void {
        this.level.merge_client_db(cnew);
    }

    step(): void {
        this.level.step();
    }

    get_db(): Db.DB<Db.World> {
	return this.level.get_db();
    }

    stringify(): string {
        return this.level.stringify();
    }
}
