/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as S from './sprite';
import * as G from './geom';
import * as A from './animation';
import * as K from './konfig';
import * as U from './util/util';
import * as D from './debug';
import * as _ from 'lodash';

export enum BgFarType {
    mountain,
    sea, // lava, water, etc.
    empty,
}

export enum BgNearType {
    city,
    sea, // lava, water, etc.
    empty,
}

export enum GroundType {
    land,
    sea, // lava, water, etc.
}

export enum OffsetEdge {
    // the player cannot overlap the sprite.
    // (note that the sprite tends to already
    // have some transparency at the top of it
    // so there's already some visual buffer there.)
    top,
    // the player can overlap down to the 'bottom' of the sprite.
    bottom, 
}

export interface Ground extends S.Sprite {
    ground_type: GroundType;
    animator: A.ResourceAnimator;
    max_y: number;
}

interface UnlocatedSpec<T> {
    images_spec: A.ImagesSpec;
    type: T;
    alpha: number;
}

interface SpecX {
    x: number;
}

interface Spec<T> extends UnlocatedSpec<T>, SpecX {}

export interface UnlocatedFarSpec extends UnlocatedSpec<BgFarType> {}
export interface FarSpec extends Spec<BgFarType> {}

export interface UnlocatedNearSpec extends UnlocatedSpec<BgNearType> {}
export interface NearSpec extends Spec<BgNearType> {}

export interface UnlocatedGroundSpec extends UnlocatedSpec<GroundType> {}
export interface GroundSpec extends Spec<GroundType> {}

// the specs are expanded from the 'far' ones, toward the front.
export const far2far_scale = 1;
export const far2near_scale = K.BG_LAYER_SCALE;
export const far2ground_scale = K.BG_LAYER_SCALE ** 2;
// the parallax is calculated from the 'ground', toward back.
// however the way we render parllax is relative to the window.
export const ground2near_scale = 1-(1/K.BG_LAYER_SCALE);
export const ground2far_scale = 1-(1/(K.BG_LAYER_SCALE**2));

export function far2near_length(far_length: number): number {
    return far_length * far2near_scale;
}

export function far2ground_length(far_length: number): number {
    return far_length * far2ground_scale;
}

type ProjectFn<E> = (fs: FarSpec) => UnlocatedSpec<E>;

function project_far_specs<E>(db: GDB.GameDB, far_specs: FarSpec[], scale: number, project: ProjectFn<E>): Spec<E>[] {
    D.assert(U.is_sorted(far_specs.map(e => e.x), U.is_asc), "far_specs x's not sorted ascending");
    // this is all a huge empirical hack. sorry.

    // 1) expand one array of the far specs into the current specs.
    const specs_template: UnlocatedSpec<E>[] = far_specs.flatMap((f: FarSpec) => {
        const p = project(f);
        // they will be cloned in step 2 so we don't have to here.
        return new Array(scale).fill(p);
    });
    // D.log("specs_template", specs_template.map((s, i) => `(${i},?,${s.type})`));

    // 2) duplicate that one array to fill the world width.
    const specs_repeated: UnlocatedSpec<E>[] = [];
    const repeats: number = Math.ceil(db.shared.world.bounds0.x / K.TILE_WIDTH / (far_specs.length*scale) );
    for (let r = 0; r < repeats; ++r) {
        specs_repeated.push(
            // clone each tiles so they don't share x's.
            ...specs_template.map(t => ({...t}))
        );
    }

    // 3) set the fully repeated array tiles to be centered around the origin.
    const anchor_x: number = 0;//-(specs_repeated.length / 2 * K.TILE_WIDTH);
    const specs: Spec<E>[] = specs_repeated.map((s, i) => ({
        ...s,
        x: anchor_x + i * K.TILE_WIDTH
    }));

    // D.log("specs", specs.map((s, i) => `(${i},${s.x},${s.type})`));
    return specs;
}

function far2far_specs(db: GDB.GameDB, far_specs: FarSpec[]): FarSpec[] {
    const specs = project_far_specs<BgFarType>(
        db,
        far_specs,
        far2far_scale,
        (f: FarSpec): UnlocatedFarSpec => f
    );
    return specs;
}

function far2near_specs(db: GDB.GameDB, far_specs: FarSpec[]): NearSpec[] {
    const images = db.uncloned.images;
    const sea: UnlocatedSpec<BgNearType> = {
        images_spec: {resource_id: K.EMPTY_IMAGE_RESOURCE_ID},
        type: BgNearType.sea,
        alpha: 1
    };
    const city_images = [images.lookup("bg/ma_near.png"), images.lookup("bg/ma_near2.png"), images.lookup("bg/ma_near3.png")];
    const city_image = city_images[(db.shared.level_index1-1) % 3];
    const city: UnlocatedSpec<BgNearType> = {
        // todo: 'city' stuff seems to never be used really for ma_*, so either test & use, or delete?
        images_spec: { resource_id: city_image },
        type: BgNearType.city,
        alpha: 1
    };
    const empty: UnlocatedSpec<BgNearType> = {
        images_spec: {resource_id: K.EMPTY_IMAGE_RESOURCE_ID},
        type: BgNearType.empty,
        alpha: 1
    };
    const specs = project_far_specs<BgNearType>(
        db,
        far_specs,
        far2near_scale,
        (f: FarSpec): UnlocatedNearSpec => {
            switch (f.type) {
                case BgFarType.sea:
                    return sea;
                case BgFarType.mountain:
                    return city;
                case BgFarType.empty:
                    return empty;
            }    
        }
    );
    return specs;
}

function far2ground_specs(db: GDB.GameDB, far_specs: FarSpec[]): GroundSpec[] {
    const images = db.uncloned.images;
    const sea: UnlocatedSpec<GroundType> = {
        images_spec: {resource_id: images.lookup("ground/sa.png")},
        type: GroundType.land,
        alpha: 1
    };
    const land: UnlocatedSpec<GroundType> = {
        images_spec: {resource_id: images.lookup("ground/ga.png")},
        type: GroundType.land,
        alpha: 1
    };
    const specs = project_far_specs<GroundType>(
        db,
        far_specs,
        far2ground_scale,
        (f: FarSpec): UnlocatedGroundSpec => {
            switch (f.type) {
                case BgFarType.sea:
                    return sea;
                case BgFarType.mountain:
                    return land;
                case BgFarType.empty:
                    return land;
            }    
        }
    );
    D.assert_eqeq(specs.length, far_specs.length * far2ground_scale);

    for (let i = 0; i < specs.length; ++i) {
        const left = U.element_looped(specs, i-1);
        const mid = U.element_looped(specs, i);
        const right = U.element_looped(specs, i+1);
        const refined = refine_ground(images, left, mid, right);
        if (refined != null) {
            specs[i] = refined;
        }
    }
    D.assert_eqeq(specs.length, far_specs.length * far2ground_scale);

    return specs;
}

function refine_ground(images: GDB.ImageResources, left: U.O<GroundSpec>, mid: U.O<GroundSpec>, right: U.O<GroundSpec>): U.O<GroundSpec> {
    if (mid?.type == GroundType.land) {
        if (left?.type == GroundType.sea) {
            return {
                ...mid,
                images_spec: {resource_id: images.lookup("ground/ga_sl.png")}
            }
        }
        else if(right?.type == GroundType.sea) {
            return {
                ...mid,
                images_spec: {resource_id: images.lookup("ground/ga_sr.png")}
            }
        }
        else {
            return mid;
        }
    }
    return mid;
}

export function max_y(db: GDB.GameDB, x: number): number {
    // in theory nobody should pass us an x outside of the world!
    D.assert(x >= 0 && x < db.shared.world.bounds0.x, "wtf x vs. bounds");
    D.assert(x/K.GROUND_SIZE.x <= db.shared.items.ground.length, "wtf x vs. ground");
    const i = Math.floor(x / K.GROUND_SIZE.x); // match: ground_mk().size.
    const ground_tile = db.shared.items.ground[i];
    D.assert(ground_tile != null, `wtf ground_tile ${i} ${db.shared.items.ground.length}`);
    return ground_tile.max_y;
}

export function p2d_max_ys(db: GDB.GameDB, p: G.P2D): number {
    const bounds = db.shared.world.bounds0;
    const maxy_left = max_y(db, G.wrap_x(G.rect_l(p), bounds));
    const maxy_right = max_y(db, G.wrap_x(G.rect_r(p), bounds));
    const maxy = Math.min(maxy_left, maxy_right);
    return maxy;
}

export function ground_mk(db: GDB.GameDB, far_specs: FarSpec[]) {
    add_ground_tiles(db, far_specs);
}

function add_ground_tiles(db: GDB.GameDB, far_specs: FarSpec[]) {
    const size = K.GROUND_SIZE; // match: max_y().i.
    const ground_specs = far2ground_specs(db, far_specs);
    ground_specs.forEach((spec: GroundSpec, i: number) => {    
        // note/todo: these are not Collidables because we'll do that another way.
        const animator = A.animator_mk(db.shared.sim_now, spec.images_spec);
        const z_back_to_front_ids = animator.z_back_to_front_ids(db);
        const lt = G.v2d_mk(spec.x, db.shared.world.ground_y);
        const max_y = lt.y;
        GDB.add_sprite_array_id_mut(
            db.shared.items.ground,
            (dbid: GDB.DBID): S.Sprite => {
                const g: Ground = {
                    dbid: dbid,
                    comment: `g-${i}-${spec.x}`,
                    vel: G.v2d_mk_0(),
                    acc: G.v2d_mk_0(),
                    lt: lt,
                    size: size,
                    alpha: 1,
                    z_back_to_front_ids: z_back_to_front_ids,
                    animator: animator,
                    ground_type: spec.type,
                    max_y: max_y,
                    step(db: GDB.GameDB) {
                        this.z_back_to_front_ids = this.animator.z_back_to_front_ids(db);
                    },
                    get_lifecycle(_:GDB.GameDB) { return GDB.Lifecycle.alive },
                    on_death(_:GDB.GameDB) {},
                    toJSON() {
                        return S.spriteJSON(this);
                    }    
                };
                return g as S.Sprite;
            }
        );
    });
}

export function bg_mk(db: GDB.GameDB, far_specs: FarSpec[]) {
    // setting the two background layers down by some arbitrary amount
    // so they layer nicely behind the real ground tiles that
    // have a little transparency at their top since they aren't
    // completely flat along their top edge.
    const ground_y = db.shared.world.ground_y + 10;
    bg_make_layer<BgFarType, FarSpec>(
        db,
        (db)=>db.shared.items.bgFar,
        ground_y,
        K.BG_FAR_BG_SIZE,
        ground2far_scale,
        "bg-f",
        far2far_specs(db, far_specs)
    );
    bg_make_layer<BgNearType, NearSpec>(
        db,
        (db)=>db.shared.items.bgNear,
        ground_y,
        K.BG_NEAR_BG_SIZE,
        ground2near_scale,
        "bg-n",
        far2near_specs(db, far_specs)
    );
}

interface MountainPrivate extends S.Sprite {
    original_pos: G.V2D;
    anim: A.ResourceAnimator;
}

function bg_make_layer<T, S extends Spec<T>>(
    db: GDB.GameDB,
    get_dict: (db: GDB.GameDB)=>U.Dict<S.Sprite>,
    ground_y: number,
    size: G.V2D,
    parallax_factor: number,
    comment_prefix: string,
    specs: S[]) {
    specs.forEach((spec: S, i: number) => {
        GDB.add_sprite_dict_id_mut(
            get_dict(db),
            (dbid: GDB.DBID): S.Sprite => {
                const x = spec.x;
                const anim = A.animator_mk(db.shared.sim_now, spec.images_spec);
                const z_back_to_front_ids = anim.z_back_to_front_ids(db);
                const original_pos = G.v2d_mk(x, ground_y - size.y);
                const lt = G.v2d_clone(original_pos);
                const bg: MountainPrivate = {
                    dbid: dbid,
                    comment: comment_prefix + `-${i}-${Math.floor(x)}`,
                    vel: G.v2d_mk_0(),
                    acc: G.v2d_mk_0(),
                    lt: lt,
                    original_pos: original_pos,
                    size: size,
                    alpha: spec.alpha,
                    z_back_to_front_ids: z_back_to_front_ids,
                    anim: anim,
                    step(db: GDB.GameDB) {
                        this.z_back_to_front_ids = this.anim.z_back_to_front_ids(db);
                        U.if_let(
                            db.shared.world.gameport.world_bounds,
                            (p: G.Rect) => {
                                // shift the sprite to make it look like parallax.
                                // when the window moves +1, it looks like the ground moves -1,
                                // so for parallax we want to the bg to move more slowly or < -1.
                                // that means we compensate by moving the bg item back towards
                                // the window a little bit. farther away bg means slower moving
                                // means shifting more towards the window.
                                // so confusing, so hacky, i know vs. just a real projection matrix!
                                // todo: do i have to fix that we lose sprites at the world boundaries?
                                const wx = G.rect_mid(db.shared.world.gameport.world_bounds).x;
                                const dx = wx * parallax_factor;
                                const lt2 = G.v2d_add(this.original_pos, G.v2d_mk(dx, 0));
                                const lt2w = G.v2d_wrapH(lt2, db.shared.world.bounds0);
                                G.v2d_set(lt2w, this.lt);
                            }
                        );
                    },
                    get_lifecycle(_:GDB.GameDB) { return GDB.Lifecycle.alive },
                    on_death(_:GDB.GameDB) {},
                    toJSON() {
                        return S.spriteJSON(this);
                    }
                };
                return bg;
            }
        );
    });
}
