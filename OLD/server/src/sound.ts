// note:
// Sfx are played once.
// Music, yet to be done, would be more complicated
// as it would likely need an explicit stop message.

export interface Sfx {
    // not just 'id' because this is safer to grep :-\
    sfx_id: string,

    // in other words: volume, 0 to 1.
    gain?: number,

    // e.g. player thrust: it should not stack up & imples looping.
    singleton?: boolean,
}

// todo: Music.

