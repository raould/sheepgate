import * as U from './util/util';

// todo: 'command' is a bad name beacuse it sounds
// like single fire messages, but this is really
// more a keyspressedmap or a commandsactivemap or something.
// match: todo: make this stuff common between both client & server.

// Command string to is_pressed boolean.
export type Inputs = {commands: {[k:string]:boolean}, keys: {[k:string]:boolean}};

export interface CommandSpec {
    command: CommandType;
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

// todo: share this (unfortunately) with the client/server, esp. the "is_singular" part.
// is_singular true means there's no auto-repeat while the key is held down.
export const key2cmd: { [k: string]: CommandSpec } = {
    Escape:     CommandSpecs[CommandType.pause],
    h:          CommandSpecs[CommandType.high_score],
    H:          CommandSpecs[CommandType.high_score],
    // standard gameplay commands.
    " ":        CommandSpecs[CommandType.fire],
    ArrowUp:    CommandSpecs[CommandType.up],
    w:          CommandSpecs[CommandType.up],
    W:          CommandSpecs[CommandType.up],
    ArrowDown:  CommandSpecs[CommandType.down],
    s:          CommandSpecs[CommandType.down],
    S:          CommandSpecs[CommandType.down],
    ArrowLeft:  CommandSpecs[CommandType.left],
    a:          CommandSpecs[CommandType.left],
    A:          CommandSpecs[CommandType.left],
    ArrowRight: CommandSpecs[CommandType.right],
    d:          CommandSpecs[CommandType.right],
    D:          CommandSpecs[CommandType.right],
    Shift:      CommandSpecs[CommandType.thrust],
    // secret debugging stuff.
    ".":        CommandSpecs[CommandType.debug_step_frame],
    "!":        CommandSpecs[CommandType.debug_dump_state],
    b:          CommandSpecs[CommandType.debug_toggle_graphics],
    n:          CommandSpecs[CommandType.debug_toggle_annotations],
    "/":        CommandSpecs[CommandType.debug_toggle_stepping],
    "^":        CommandSpecs[CommandType.debug_win_level],
    "&":        CommandSpecs[CommandType.debug_lose_level],
    "*":        CommandSpecs[CommandType.debug_smite],
};
