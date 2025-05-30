/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
// note:
// Sfx are played once.
// Music, yet to be done, would be more complicated
// as it would likely need an explicit stop message.

export interface Sfx {
    // not just 'id' because this is safer to grep :-\
    sfx_id: string,

    // in other words: volume, 0 to 1.
    // defaults to 1.
    gain?: number,

    // 1 is regular speed.
    // defaults to 1.
    playback_rate?: number,

    // e.g. player thrust: it should not stack up & imples looping.
    singleton?: boolean,
}

// todo: Music.

