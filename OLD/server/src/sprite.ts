/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as G from './geom';
import * as C from './collision';
import * as Dr from './drawing';
import * as Sh from './fighter_shield';
import * as U from './util/util';
import * as Tf from './type_flags';
import * as F from './facing';
import * as D from './debug';

// todo: too late, but this kind of atomization of interfaces
// and structural typing ends up being really confusing
// to anybody trying to figure out what actually has what.
// i do not know of any dev tools environment that solves
// that problem, and my minimalistic approach using just
// unextended emacs sure doesn't.
// weap and learn from this, young jedi.

// todo: these are growing to maybe
// have too much stuff in them, see
// the evolution of the player.ts.Player.
// (however!!! part of the reason so
// much is in here is that it helps
// reduce (only sorta) having too
// many circular imports.)

export interface Facing {
    // akin to a 'normal' vector.
    facing: F.Facing;
}

// todo: the various uses of images and drawing
// are all a horrible accreted big ball of poopy mud.
// very confusing. redesign!

export interface ImageSized {
    resource_id: string;
    size: G.V2D;
}

export interface ImageLocated {
    resource_id: string;
    rect: G.Rect;
}

export interface ImageResource {
    // note: zero alpha means the sprite is hidden from the world.
    alpha: number;
    // you can use any or all of these simultaneously. most sprites just use
    // the resource_id. a few have more than one layer of raster
    // images and use the z_back_to_front_ids instead. currently maybe
    // only explosionB uses the drawing.
    z_back_to_front_ids?: Array<string>; // z[0] is most 'distant'.
    resource_id?: string; // on top of z_back_to_front.
    drawing?: Dr.Drawing; // on top of resource_id.
}

export interface HitPoints {
    hp_init: number; // must never be zero since it is often used in division.
    hp: number;
}

export interface Damage {
    damage: number;
}

// explicitly no hit points & isn't S.CollidableSprite.
// todo: it is confusing that step() isn't in any of these interfaces.
export interface Sprite extends GDB.Item, G.P2D, GDB.Aliveness, ImageResource, GDB.Steps, Tf.Flagged {
    draw_lt?: G.V2D;
    toJSON(): Object;
}

// ideally only the things the client really needs for rendering, nothing more.
// yet another reason to be using real typescript classes instead of kneecapped interface hell?
export function spriteJSON(s: Sprite): Object {
    return {
        lt: s.lt,
	draw_lt: s.draw_lt,
        size: s.size,
        alpha: s.alpha,
        z_back_to_front_ids: s.z_back_to_front_ids,
        resource_id: s.resource_id,
        drawing: s.drawing,
    };
}

export interface HpSprite extends Sprite, HitPoints, Damage {
    // explicitly not extending S.CollidableSprite here
    // because the players and enemies inside shields
    // aren't collidable - they die when their shield does.
}

export interface CollidableSprite extends HpSprite, C.Masked, C.Ignores {
    // expected to be a closure that knows 'this' and the narrowest type of 'this'.
    // match: implementations have to take into account the world wrapping.
    collide(db: GDB.GameDB, dsts: Set<CollidableSprite>): void;
}

export interface Base extends Sprite, Shielded {
    beam_down_rect: G.Rect;
}

export interface Gem extends CollidableSprite {
}

// this is a very handwavy arbitrary rating,
// used for things like what kinds of explosions fx
// to use, and how much to shake the screen.
export enum Rank {
    // note: these are an ordering and are used as such in code.
    // (todo/note: ideally this means the hp & weapon values
    // should be scaled along these lines too. sorta. maybe.)
    basic,
    small,
    player,
    mega,
    hypermega,
};

// values.length must be >= 5, one per rank.
export function rank2value(rank: Rank, values: any[]): any {
    D.assert(values.length >= 5);
    switch (rank) {
    case Rank.basic: return values[0];
    case Rank.small: return values[1];
    case Rank.player: return values[2];
    case Rank.mega: return values[3];
    case Rank.hypermega: return values[4];
    default: return 1;
    }
}

// sad that i am too lazy to actually thread
// mass through all the sprites so i did this
// crappy hack instead. todo: not this!
export function rank2mass(rank: Rank): number {
    switch (rank) {
        case Rank.basic: return 1;
        case Rank.small: return 1;
        case Rank.player: return 1;
        case Rank.mega: return 3;
        case Rank.hypermega: return 3;
        default: U.unreachable(rank);
    }
}

export interface Ranked {
    rank: Rank
};

export interface Warpin extends Sprite, Ranked { // only fx, no hp.
}

export interface Explosion extends Sprite, Ranked, Tf.Flagged { // only fx, no hp.
}

// fighters don't have their own hp, it is all in their shield.
export interface Fighter extends Sprite, Ranked, Facing, Tf.Flagged, Shielded {
    weapons: Arsenal;
    // todo: these should really come from magic pixels in the image resources.
    get_weapon_hardpoint(weapon_type: WeaponType, facing: F.Facing): G.V2D;
}

export interface Player extends Fighter {
    // note: the player has an extra hard-coded ability to crash through enemies somewhat.
    passenger_max: number;
    maybe_shoot(db: GDB.GameDB): void;
    maybe_beam_up_person(db: GDB.GameDB, maybe_person: CollidableSprite): void;
    maybe_beam_down_to_base(db: GDB.GameDB, maybe_base_shield: CollidableSprite): void;
}

export interface Enemy extends Fighter {
    // although a lot of enemies
    // do not look different depending
    // on the facing.
}

// Shielded should not be a full CollidableSprite, but
// does get informed when thier shield collides.
export interface Shielded {
    shield_id?: GDB.DBID;
    set_lifecycle(lifecycle: GDB.Lifecycle): void;
    on_collide(db: GDB.GameDB, dst: CollidableSprite): void;
}

export interface Shield<T extends Shielded> extends CollidableSprite {
    // note: shields are coupled with the state+lifecycle of their fighter.
    // note: the player has an extra hard-coded ability to crash through enemies somewhat.
    get_wrapped(db: GDB.GameDB): U.O<T>;
    anim?: Sh.ShieldHitAnimation;
    // also see fighter_shield.ShieldWrappingSpec.
}

export interface Person extends CollidableSprite {
    beam_up(db: GDB.GameDB): void;
    beam_down(db: GDB.GameDB, down_rect: G.Rect, on_end: (db: GDB.GameDB) => void): void;
}

export enum WeaponType {
    ball,
    bullet
}

export interface Weapon {
    // see: Fighter.get_weapon_hardpoint().
    weapon_type: WeaponType;
    shot_mk(db: GDB.GameDB, src: Fighter, forced: boolean): U.O<GDB.Identity>;
}

export interface Shot extends CollidableSprite, Facing {
    life_msec: number;
}

export type Arsenal = {[k:string]: Weapon};
