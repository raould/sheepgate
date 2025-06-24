/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as U from './util/util';

// todo: 'command' is a bad name beacuse it sounds
// like single fire messages, but this is really
// more a keyspressedmap or a commandsactivemap or something.
// match: todo: make this stuff common between both client & server.

// Command string to is_pressed boolean.
export type Inputs = {
    commands: { [k:string]: boolean },
    keys: { [k:string]: boolean }
};

export interface CommandSpec {
    command: CommandType;
    // true: event happens once per key press.
    // false: event continues as long as key is pressed.
    // (i guess?)
    is_singular: boolean;
}

export enum CommandType {
    pause = "pause",
    high_score = "high_score",
    fire = "fire",
    up = "up",
    down = "down",
    left = "left",
    right = "right",
    thrust = "thrust",
    debug_toggle_graphics = "debug_toggle_graphics",
    debug_toggle_annotations = "debug_toggle_annotations",
    debug_toggle_stepping = "debug_toggle_stepping",
    debug_step_frame = "debug_step_frame",
    debug_dump_state = "debug_dump_state",
    debug_win_level = "debug_win_level",
    debug_lose_level = "debug_lose_level",
    debug_smite = "debug_smite",
}
export const AllCommands = new Set<string>(Object.keys(CommandType));
function add_spec(assoc: { [k: string]: CommandSpec }, spec: CommandSpec ) {
    assoc[spec.command] = spec;
}
export const CommandSpecs: { [k: string]: CommandSpec } = {};
add_spec(CommandSpecs, { command: CommandType.pause, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.high_score, is_singular: true });
// standard gameplay commands.
add_spec(CommandSpecs, { command: CommandType.fire, is_singular: false });
add_spec(CommandSpecs, { command: CommandType.up, is_singular: false });
add_spec(CommandSpecs, { command: CommandType.down, is_singular: false });
add_spec(CommandSpecs, { command: CommandType.left, is_singular: false });
add_spec(CommandSpecs, { command: CommandType.right, is_singular: false });
add_spec(CommandSpecs, { command: CommandType.thrust, is_singular: false });
// secret debugging stuff.
add_spec(CommandSpecs, { command: CommandType.debug_step_frame, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_dump_state, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_toggle_graphics, is_singular: true }); // de"b"ug mnemonic :-(
add_spec(CommandSpecs, { command: CommandType.debug_toggle_annotations, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_toggle_stepping, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_win_level, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_lose_level, is_singular: true });
add_spec(CommandSpecs, { command: CommandType.debug_smite, is_singular: true });
