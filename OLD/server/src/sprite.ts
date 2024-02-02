import * as GDB from './game_db';
import * as G from './geom';
import * as C from './collision';
import * as Dr from './drawing';
import * as Sh from './fighter_shield';
import * as U from './util/util';
import * as Tf from './type_flags';
import * as F from './facing';

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
    // match: the client has to draw them in this order.
    // note/todo: these 3 are in back-to-front z order.
    // z order e.g 5,4,3,2,1=resource_id,0=drawing.
    z_back_to_front_ids?: Array<string>;
    resource_id?: string;
    drawing?: Dr.Drawing;
}

export interface HitPoints {
    hp_init: number;
    hp: number;
}

export interface Damage {
    damage: number;
}

// explicitly no hit points & isn't S.CollidableSprite.
export interface Sprite extends GDB.Item, G.P2D, GDB.Aliveness, ImageResource, GDB.Steps, Tf.Flagged {
    toJSON(): Object;
}

// ideally only the things the client really needs for rendering, nothing more.
// yet another reason to be using real typescript classes instead of kneecapped interface hell?
export function spriteJSON(s: Sprite): Object {
    return {
        lt: s.lt,
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
    next_beam_down_rect(db: GDB.GameDB): G.Rect;
}

export interface Gem extends CollidableSprite {
}

// this is a very handwavy arbitrary rating,
// used for things like what kinds of explosions fx
// to use, and how much to shake the screen.
export enum Scale {
    // note: these are an ordering and are used as such in code.
    // (todo/note: ideally this means the hp & weapon values
    // should be scaled along these lines too. sorta. maybe.)
    small,
    player,
    mega,
    hypermega,
};

// sad that i am too lazy to actually thread
// mass through all the sprites so i did this
// crappy hack instead. todo: not this!
export function scale2mass(scale: Scale): number {
    switch (scale) {
        case Scale.small: return 1;
        case Scale.player: return 1;
        case Scale.mega: return 3;
        case Scale.hypermega: return 3;
        default: U.unreachable(scale);
    }
}

export interface Scaled {
    scale: Scale
};

export interface Warpin extends Sprite, Scaled { // only fx, no hp.
}

export interface Explosion extends Sprite, Scaled, Tf.Flagged { // only fx, no hp.
}

// fighters don't have their own hp, it is all in their shield.
export interface Fighter extends Sprite, Scaled, Facing, Tf.Flagged, Shielded {
    weapons: Arsenal;
    // todo: these should really come from magic pixels in the image resources.
    get_weapon_hardpoint(weapon_type: WeaponType, facing: F.Facing): G.V2D;
}

export interface Player extends Fighter {
    // note: the player has an extra hard-coded ability to crash through enemies somewhat.
    passenger_ids: Set<GDB.DBID>;
    passenger_max: number;
    beaming_ids: Set<GDB.DBID>;
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
