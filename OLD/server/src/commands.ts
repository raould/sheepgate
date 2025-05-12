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
    debug_toggle_graphics = "debug_toggle_graphics",
    debug_toggle_annotations = "debug_toggle_annotations",
    debug_toggle_stepping = "debug_toggle_stepping",
    debug_step_frame = "debug_step_frame",
    debug_dump_state = "debug_dump_state",
    debug_win_level = "debug_win_level",
    debug_lose_level = "debug_lose_level",
}

// todo: share this (unfortunately) with the client/server, esp. the "is_singular" part.
// is_singular true means there's no auto-repeat while the key is held down.
export const key2cmd: { [k: string]: CommandSpec } = {
    Escape:     { command: CommandType.pause, is_singular: true },
    h:          { command: CommandType.high_score, is_singular: true },
    H:          { command: CommandType.high_score, is_singular: true },

    // standard gameplay commands.
    " ":        { command: CommandType.fire, is_singular: false },
    ArrowUp:    { command: CommandType.up, is_singular: false },
    w:          { command: CommandType.up, is_singular: false },
    W:          { command: CommandType.up, is_singular: false },
    ArrowDown:  { command: CommandType.down, is_singular: false },
    s:          { command: CommandType.down, is_singular: false },
    S:          { command: CommandType.down, is_singular: false },
    ArrowLeft:  { command: CommandType.left, is_singular: false },
    a:          { command: CommandType.left, is_singular: false },
    A:          { command: CommandType.left, is_singular: false },
    ArrowRight: { command: CommandType.right, is_singular: false },
    d:          { command: CommandType.right, is_singular: false },
    D:          { command: CommandType.right, is_singular: false },
    
    // secret debugging stuff.
    ".":        { command: CommandType.debug_step_frame, is_singular: true },
    "!":        { command: CommandType.debug_dump_state, is_singular: true },
    b:          { command: CommandType.debug_toggle_graphics, is_singular: true }, // de"b"ug mnemonic :-(
    n:          { command: CommandType.debug_toggle_annotations, is_singular: true },
    "/":        { command: CommandType.debug_toggle_stepping, is_singular: true },
    "^":        { command: CommandType.debug_win_level, is_singular: true },
    "&":        { command: CommandType.debug_lose_level, is_singular: true },
};
