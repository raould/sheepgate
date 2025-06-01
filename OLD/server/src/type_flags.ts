/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as U from './util/util';

export interface Flagged {
    type_flags?: TF;
}

// this is a very depressing replacement for instanceof/nominal typing.
export enum TF {
    // match: tfs_test()
    // match: TF.all, Tf.everything.
    none = 0,
    FIRST = 1 << 0,
    player = FIRST,
    base = 1 << 1, // can only ever 'belong' to the player.
    enemy = 1 << 2,
    ship = 1 << 3,
    shield = 1 << 4,
    shot = 1 << 5,
    explosion = 1 << 6,
    person = 1 << 7,
    gem = 1 << 8,
    LAST = gem,
    // some common composite flags.
    playerShip = TF.player | TF.ship,
    enemyShip = TF.enemy | TF.ship,
    playerShield = TF.player | TF.shield,
    enemyShield = TF.enemy | TF.shield,
    playerShot = TF.player | TF.shot,
    enemyShot = TF.enemy | TF.shot,
    playerExplosion = TF.player | TF.explosion,
    enemyExplosion = TF.enemy | TF.explosion,
    baseShield = TF.base | TF.shield,
    // boilerplate from hell fun not.
    all = TF.player | TF.base | TF.enemy | TF.ship | TF.shield | TF.shot | TF.person | TF.gem,
}

export const tf_everything = [
    TF.player, TF.base, TF.enemy, TF.ship, TF.shield, TF.shot, TF.person, TF.gem,
];

export function firstMatch(src: U.O<TF>, query: TF[]): TF {
    let matches = query.filter(q => U.has_bits(src, q));
    if (matches.length > 0) {
        return matches[0];
    }
    else {
        return TF.none;
    }
}

export function trade(type_flags: TF, disable: TF, enable: TF): TF {
    return (type_flags & ~disable) | enable;
}

export function overlaps(type_flags: TF, others: TF[]): boolean {
    return others.map(o => U.has_bits(o, type_flags)).reduce((a,e) => a||e, false);
}

export function overlaps_eq(type_flags: TF, others: TF[]): boolean {
    return others.map(o => U.has_bits_eq(o, type_flags)).reduce((a,e) => a||e, false);
}

// no i have not really tested these helper functions... :-(
// todo: decide if we should never be doing exact testing,
// because that is too fragile as we add more misc flags over
// time, or if it is still good to support because it forces
// things to be less loosey goosey?
export const exact = true;
export const loose = false;
export function either(a: TF, b: TF, test: TF, mode: boolean = exact): boolean {
    if (mode == exact) {
        return U.has_bits_eq(a, test) || U.has_bits_eq(b, test);
    }
    else {
        return U.has_bits(a, test) || U.has_bits(b, test);
    }
}
export function both(a: TF, b: TF, test: TF, mode: boolean = exact): boolean {
    if (mode == exact) {
        return (U.has_bits_eq(a, test) && U.has_bits_eq(b, test));
    }
    else {
        return U.has_bits(a, test) && U.has_bits(b, test);
    }
}
// todo: come up with a not-bad function name for this.
export function one_to_one(a: TF, b: TF, t1: TF, t2: TF, mode: boolean = exact): boolean {
    if (mode == exact) {
        return (U.has_bits_eq(a, t1) && U.has_bits_eq(b, t2)) ||
                (U.has_bits_eq(a, t2) && U.has_bits_eq(b, t1));
    }
    else {
        return (U.has_bits(a, t1) && U.has_bits(b, t2)) ||
                (U.has_bits(a, t2) && U.has_bits(b, t1));
    }
}
