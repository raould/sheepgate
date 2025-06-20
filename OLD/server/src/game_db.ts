/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Db from './db';
import * as Cdb from './client_db';
import * as C from './collision';
import * as S from './sprite';
import * as So from './sound';
import * as Pr from './particles';
import * as G from './geom';
import * as U from './util/util';
import * as D from './debug';
import * as Dr from './drawing';
import * as Gr from './ground';
import * as Sc from './scoring';
import * as Gs from './game_stepper';
import { Toast } from './toast';
import * as Tkg from './ticking_generator';

// NOTE: a lot of this is mostly for in-levels, see menu/menu_db, it is very confusing.

// fyi "mut" -> "mutating" -> changes the given collection rather than returning a new filtered one.

// todo:
// THIS NEEDS TO BE SPLIT UP INTO
// inter-level data vs. intra-level data.

// todo:
// renaming over time has left some of
// the names starting with "DB" when maybe
// they should now start with "GDB" since
// it is GameDB.

// note: this is written so that we can
// as much as possible just json barf
// it directly to the client, and the
// client can be pretty dumb and not have
// to know anything like nested level structure.
// as a result, the GDB ends up having less
// structure than maybe i'd otherwise like.

export type Callback = (db: GameDB) => void;
export function EmptyCallback(db: GameDB) { };

// (i wanted to try things like
// type dbid = string;
// but that doesn't work in all places you'd expect,
// or
// dbid: GDB.DBID & { readonly __ttag: unique symbol };
// but that cannot be round-tripped through hash keys and
// no type aliases can be round-tripped through hash keys :(
// so i kinda hate (at least my understanding of) typescript?)
export const MISSING_ID = "<missing_id>";
export type DBID = string;
export interface Identity {
    dbid: DBID;
}
export type PreDbId<T> = Omit<T, 'dbid'>;

export interface Comment {
    comment: string;
}
export enum Lifecycle {
    alive,
    dead,
}

export interface Aliveness {
    // note: for a Sprite, aliveness is (most often) based on time.
    // for a(n) HpSprite, aliveness is based on hp > 0.
    get_lifecycle(db: GameDB): Lifecycle;
    on_death?(db: GameDB): void;
}

// steps in the sense of physics simulation.
export interface Steps {
    step(db: GameDB): void;
}

// todo: see if narrowing the type with Item<T> would be useful.
export interface Item extends Identity, Comment, Aliveness { // todo: step()?
}

// todo: should be in the db type/instance so that each db can have its own numbering space. whatever.
var next_db_id: number = 0;

// we are burning through these with things like shots, hope there's enough integers in the universe, heh.
// note: we must never re-use ids, because that could break all sorts of bookkeeping eg. beam_up, beam_down.
export function id_mk(): string {
    const i = next_db_id;
    next_db_id++;
    return i.toString();
}

export function id_mut<T extends Item>(fn: (_: DBID) => U.O<T>) {
    const dbid = id_mk();
    return fn(dbid);
}

// slightly dangerous in that it is re-using the item's dbid.
// do not use this unless you must (e.g. beaming), use add_dict_id_mut() et. al.
export function add_item<T extends Identity>(collection: U.Dict<T>, item: T) {
    D.assert(U.exists(item.dbid));
    D.assert(collection[item.dbid] == undefined);
    collection[item.dbid] = item;
}

export function add_dict_id_mut<T extends D, D extends Item>(collection: U.Dict<D>, fn: (_: DBID) => U.O<T>): U.O<T> {
    const dbized = id_mut(fn);
    // const size_before = U.count_dict(collection);
    if (dbized != null) {
        // duplication of id feels sorta bad to me because things are always
        // mutable and could thus get out of sync, but we do need the bijectional references.
        collection[dbized.dbid] = dbized;
    }
    // const size_after = U.count_dict(collection);
    // D.log("add_dict_id_mut", size_before, size_after, dbized?.comment);
    return dbized;
}

export function add_sprite_dict_id_mut<T extends D, D extends S.Sprite>(collection: U.Dict<D>, fn: (_: DBID) => U.O<T>): U.O<T> {
    return add_dict_id_mut(collection, fn);
}

export function add_array_id_mut<T extends Item>(collection: Array<T>, fn: (_: DBID) => U.O<T>): U.O<T> {
    const dbized = id_mut(fn);
    if (dbized != null) {
        collection.push(dbized);
    }
    return dbized;
}

export function add_sprite_array_id_mut<T extends S.Sprite>(collection: Array<T>, fn: (_: DBID) => U.O<T>): U.O<T> {
    return add_array_id_mut(collection, fn);
}

export interface Prev<T> {
    prev: T;
}

// note: apparently this is for levels only, not for e.g. splash screen.
export interface GameDB {
    uncloned: DBUncloned,
    local: DBLocal,
    // *** warning: note that all of 'shared' round-trips with the client! ***
    shared: DBShared,
}

// in case we want to do any custom hacks or logging.
export function stringify(db: GameDB): string {
    // todo: maybe don't send data for anything outside the current window.

    // don't send all the debug drawing data if we don't have to.
    // todo: all this (ie debugging_state) needs to be moved up and out of game_db to be shared with menu_db.
    const hide_debug_drawing = !db.local.client_db.debugging_state.is_drawing;
    let d: U.O<Dr.Drawing[]> = undefined;
    let src = db.shared;
    if (hide_debug_drawing) { // save them...
        d = src.debug_graphics;
        src.debug_graphics = [];
    }
    // todo: optimize the toJSON()s.
    const json = U.stringify(db.shared);
    if (hide_debug_drawing && d != null) { // ...restore them.
        src.debug_graphics = d;
    }
    return json;
}

export type StateModifier = (db: GameDB) => U.O<Gs.StepperState>;

// todo: figure out how best to manage what things
// should vs. should not be cloned across simulation steps.
// and all the semantic nunace around it all.
export interface DBUncloned {
    // this really never changes. although it could be
    // split up so that each level would have its own images.
    images: ImageResources;
    // i felt gross cloning this every time, that's the
    // only subjective reason i moved it here.
    collision: C.Collision;
}

// todo: extract type so client can use it.
// todo: make json-un/marshallers since we don't
// need full objects sent to the client?! perf?
export interface DBLocal {
    client_db: Cdb.ClientDB;
    prev_db: GameDB;
    frame_dt: number;
    // help track fps. currently not using 'prev' db fwiw.
    fps_marker: { tick: number, msec: number };
    state_modifiers: StateModifier[],
    ticking_generators: U.Dict<Tkg.TickingGenerator<unknown>>,
    // note: the generators should be running from the start
    // of the level until they individually expire, otherwise
    // if there's any transition between generators running
    // such that there's zero enemies and zero generators, the
    // player could immediately win even before actually finishing
    // off all of the generators required. the further nuance
    // is that you need to count this & enemies & warpins.
    enemy_generators: U.Dict<Tkg.TickingGenerator<unknown>>,
    player_zone_width: number;
    // todo: support multiple players, one Scoring per each.
    scoring: Sc.Scoring;
    toasts: U.Dict<Toast>, 
    hud: {
        left: G.Rect,
        right: G.Rect,
        radar: {
            // note: these are screen coordinates, not world coordinates unlike other sprites/drawing.
            // todo: would be nice to have newtypes for screen vs. world coordinates.
            scale: G.V2D;
            rect: G.Rect;
            inset_rect: G.Rect;
        }
    };
}

export interface SoundResources {
    lookup(resource: string): string;
}

export interface ImageResources {
    lookup(resource: string): string;
    lookup_range_n(templater: (n: number) => string, start: number, end: number): string[];
    lookup_range_a<T>(templater: (a: T) => string, ts: T[]): string[];
}

// *** warning: note that all of 'shared' round-trips with the client! ***
export interface DBSharedCore extends Db.DB<GameWorld> { // todo: better name.
    // note: inherited stuff like frame_drawing.

    level_index1: number; // 1-based.
    screen_shake: G.V2D;
    fps: number;    
    hud_drawing: Dr.Drawing; // match: these are always in screen space!

    // somebody want to tell me exactly how these work? lifetime? coordinate system?
    permanent_bg_drawing: Dr.Drawing;
    permanent_fg_drawing: Dr.Drawing;

    // DBSharedCore is then extended to DBShared with 'items'.
}

// *** warning: note that all of 'shared' round-trips with the client! ***
export interface GameWorld extends Db.World {
    ground_y: number;
    ground_bounds: G.Rect;
    gameport: {
        // these are at 1:1 scale, so there
        // is never any scaling to do between them,
        // only translation.
        world_bounds: G.Rect,
        screen_bounds: G.Rect,
        enemy_firing_bounds: G.Rect,
    }    
}

// *** warning: note that all of 'shared' round-trips with the client! ***
export interface DBShared extends DBSharedCore {
    items: DBSharedItems;
}

// *** warning: note that all of 'shared' round-trips with the client! ***
// this is separate from DBSharedCore because of the temporal
// order of trying to set things up: when making the items,
// we need some basic info first, which is kept in DBSharedCore. (ugh!)
export interface DBSharedItems {
    // match: get_sprite(), all_sprite_ids(), stringify(), step(), et. al. !!!

    // only a single-player game thus far.
    player: U.O<S.Player>; 
    player_shadow: U.O<S.Sprite>; 

    // todo: deconflate the fact that in several ways
    // this is an unholy conflation of model & view.
    enemies: U.Dict<S.Enemy>;
    warpin: U.Dict<S.Warpin>;
    shields: U.Dict<S.Shield<S.Shielded>>;
    shots: U.Dict<S.Shot>;
    explosions: U.Dict<S.Explosion>;
    sky: U.Dict<S.Sprite>;
    bgFar: U.Dict<S.Sprite>;
    bgNear: U.Dict<S.Sprite>;
    // array so we can O(1) index for y limiting.
    ground: Array<Gr.Ground>;
    base: S.Base;
    people: U.Dict<S.Person>;
    gems: U.Dict<S.Gem>;
    fx: U.Dict<S.Sprite>;
    particles: U.Dict<Pr.ParticleGenerator>;
}

// match: DBSharedItems.
export function debug_dump_items(db: GameDB, msg?: string) {
    D.log(
        db.shared.tick,
        db.shared.sim_now,
        msg || "",
        `player=${db.shared.items.player != null}`,
        `#warpin=${U.count_dict(db.shared.items.warpin)}`,
        `#enemies=${U.count_dict(db.shared.items.enemies)}`,
        `#shields=${U.count_dict(db.shared.items.shields)}`,
        `#shots=${U.count_dict(db.shared.items.shots)}`,
        `#explosions=${U.count_dict(db.shared.items.explosions)}`,
        `#sky=${U.count_dict(db.shared.items.sky)}`,
        `#bgFar=${U.count_dict(db.shared.items.bgFar)}`,
        `#bgNear=${U.count_dict(db.shared.items.bgNear)}`,
        `#ground=${db.shared.items.ground.length}`,
        `base=${db.shared.items.base != null}`,
        `#people=${U.count_dict(db.shared.items.people)}`,
        `#gems=${U.count_dict(db.shared.items.gems)}`,
        `#fx=${U.count_dict(db.shared.items.fx)}`,
        `#sfx=${U.count_dict(db.shared.sfx)}`,
    );
}

// match: DBSharedItems.
// todo: most of this is really a per-level assert,
// because e.g. enemies don't have to exist on menus etc.
export function assert_dbitems(db: GameDB) {
    const items = db.shared.items;
    // note: dicts should pretty much always be there anyway, even if empty.
    // was using this for debugging something once, left it all in.
    D.assert(items.warpin != null, () => "missing warpin");
    D.assert(items.enemies != null, () => "missing enemies");
    D.assert(items.shields != null, () => "missing shields");
    D.assert(items.shots != null, () => "missing shots");
    D.assert(items.explosions != null, () => "missing explosions");
    D.assert(items.sky != null, () => "missing sky");
    D.assert(items.bgFar != null, () => "missing bgFar");
    D.assert(items.bgNear != null, () => "missing bgNear");
    D.assert(items.ground != null, () => "missing ground");
    D.assert(Array.isArray(items.ground), () => "ground should be Array type");
    D.assert(items.base != null, () => "missing base");
    D.assert(items.people != null, () => "missing people");
    D.assert(items.gems != null, () => "missing gems");
    D.assert(items.fx != null, () => "missing fx");
}

// match: DBShared.
// todo: yeah, this is a really lame "database".
export function get_sprite(db: GameDB, sid: U.O<DBID>): U.O<S.Sprite> {
    if (U.exists(sid)) {
	const p = db.shared.items.player;
	const w = db.shared.items.warpin[sid];
	const e = db.shared.items.enemies[sid];
	const h = db.shared.items.shields[sid];
	const s = db.shared.items.shots[sid];
	const x = db.shared.items.explosions[sid];
	const b = get_base(db, sid);
	const pp = db.shared.items.people[sid];
	const gg = db.shared.items.gems[sid];
	const fx = db.shared.items.fx[sid];
	const most = (p?.dbid == sid ? p : undefined) || w || e || h || s || x || b || pp || gg || fx;
	return most;
    }
    return undefined;
}

export function get_player(db: GameDB): U.O<S.Player> {
    return db.shared.items.player;
}

export function get_player_shadow(db: GameDB): U.O<S.Sprite> {
    return db.shared.items.player_shadow;
}

export function get_warpin(db: GameDB, wid: U.O<DBID>): U.O<S.Sprite> {
    return U.exists(wid) ? db.shared.items.warpin[wid] : undefined;
}

export function get_enemy(db: GameDB, eid: U.O<DBID>): U.O<S.Enemy> {
    return U.exists(eid) ? db.shared.items.enemies[eid] : undefined;
}

export function get_shield(db: GameDB, sid: U.O<DBID>): U.O<S.Shield<S.Shielded>> {
    return U.exists(sid) ? db.shared.items.shields[sid] : undefined;
}

export function get_shot(db: GameDB, sid: U.O<DBID>): U.O<S.Shot> {
    return U.exists(sid) ? db.shared.items.shots[sid] : undefined;
}

export function get_base(db: GameDB, sid: U.O<DBID>): U.O<S.Base> {
    if (U.exists(sid)) {
	const b = db.shared.items.base;
	if (b?.dbid === sid) {
	    return b;
	}
    }
    return undefined;
}

export function get_fighter(db: GameDB, sid: U.O<DBID>): U.O<S.Fighter> {
    let e: U.O<S.Fighter>;
    if (U.exists(sid)) {
	e = db.shared.items.enemies[sid];
    }
    // this looks bad but the real problem is that the player is a
    // special case of fighter in the db. :-(
    if (U.isU(e)) {
	e = get_player(db);
    }
    return e;
}

export function get_person(db: GameDB, pid: U.O<DBID>): U.O<S.Person> {
    return U.exists(pid) ? db.shared.items.people[pid] : undefined;
}

export function get_person_waiting(db: GameDB, pid: U.O<DBID>): U.O<S.Person> {
    const p =  U.exists(pid) ? db.shared.items.people[pid] : undefined;
    if (p == undefined) { return p; }
    return p.beaming_state == S.BeamingState.not_beaming ? p : undefined;
}

export function get_person_beaming(db: GameDB, pid: U.O<DBID>): U.O<S.Person> {
    const p =  U.exists(pid) ? db.shared.items.people[pid] : undefined;
    if (p == undefined) { return p; }
    return p.beaming_state != S.BeamingState.not_beaming ? p : undefined;
}

export function get_beamers(db: GameDB): Array<S.Person> {
    return Object.values(db.shared.items.people).filter(p => p.beaming_state != S.BeamingState.not_beaming);
}

export function get_beaming_count(db: GameDB): number {
    let count = 0;
    Object.values(db.shared.items.people).forEach((p) => {
	if (p.beaming_state != S.BeamingState.not_beaming) { ++count; }
    });
    return count;
}

export function get_gem(db: GameDB, pid: U.O<DBID>): U.O<S.Gem> {
    return U.exists(pid) ? db.shared.items.gems[pid] : undefined;
}

export function get_fx(db: GameDB, fid: U.O<DBID>): U.O<S.Sprite> {
    return U.exists(fid) ? db.shared.items.fx[fid] : undefined;
}

export function is_in_bounds(db: GameDB, p: G.P2D): boolean {
    if (p.lt.x < 0) { return false; }
    if (p.lt.x >= db.shared.world.bounds0.x) { return false; }
    // ugh, we can't check y very well because we actually let things
    // purposefully be "up in space" or "down past ground_y"
    // for gameplay and visual reasons.
    return true;
}

function keep_fn(db: GameDB, dbid: U.O<DBID>, e: Aliveness) {
    return U.exists(dbid) && e.get_lifecycle(db) == Lifecycle.alive;
}

// match: DBLocal.
export function reap_local(db: GameDB) {
    for (const t of ['ticking_generators']) {
        reap_named(db, db.local, t);
    }
    for (const t of ['enemy_generators']) {
        reap_named(db, db.local, t);
    }
}

// match: DBShared.
export function reap_items(db: GameDB) {
    // 1) reap player, since there's currently only one, not in a collection.
    const player = get_player(db);
    if (player != null && !keep_fn(db, player.dbid, player)) {
        delete db.shared.items.player;
        player.on_death?.(db);
    }

    // 2) reap everything else, since they are in sprite collections.
    // todo: this is horrible horrible horrible bad.
    // todo: i *so* hate using strings like this. i mean how do we know we have full coverage?
    // match: !!! DBSharedItems !!!
    // note that some things are either never reap'd or reap'd differently:
    // player, sky, bgFar, bgNear, ground, base, particles, drawing. 
    for (const t of ['warpin', 'enemies', 'shields', 'shots', 'explosions', 'fx', 'people', 'gems']) {
        reap_named(db, db.shared.items, t);
    }
}

export function reap_particles(db: GameDB) {
    // todo: fuhgly that 'particle' handling is some super special hard coded stuff right here. :(
    for (const kv of Object.entries(db.shared.items.particles)) {
        const [pid, pgen]: [string, Pr.ParticleGenerator] = kv;
        if (pgen.get_lifecycle(db) == Lifecycle.dead) {
            delete db.shared.items.particles[pid];
        }
    }
}

function reap_named<T extends S.Sprite>(db: GameDB, parent: object, name: string) {
    D.assert(Object.keys(parent).includes(name), name);
    // @ts-ignore
    const collection = parent[name];
    // @ts-ignore
    const f: U.FilteredDict<T> = reap_sprites(db, collection);
    // @ts-ignore
    parent[name] = f.kept;
    for (const r of Object.values(f.removed)) {
        r.on_death?.(db);
    }
}

function reap_sprites<T extends S.Sprite>(db: GameDB, collection: U.Dict<T>): U.FilteredDict<T> {
    return U.filter_dict<T>(collection, (dbid, e) => keep_fn(db, dbid, e));
}

export function reap_item<T extends Identity>(collection: U.Dict<T>, item: T) {
    D.assert(U.exists(item.dbid));
    delete collection[item.dbid];
}
