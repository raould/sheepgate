import * as GDB from './game_db';
import * as G from './geom';
import * as Cmd from './commands';
import * as A from './animation';
import * as U from './util/util';

// ideally we'd be consistenly using this to be consistent.
// match: also implies that code should do (left, right) when both are paired.
export const DefaultFacing = Facing.left;

// todo: see comment about facing in enemy_ball_weapon.
export const enum Facing {
    left,
    right
}

export function opposite_facing(facing: Facing): Facing {
    switch (facing) {
        case Facing.left: return Facing.right;
        case Facing.right: return Facing.left;
        default: U.unreachable(facing);
    }
}

export function on_facing<R>(facing: Facing, left: R, right: R): R {
    switch (facing) {
        case Facing.left: return left;
        case Facing.right: return right;
        default: U.unreachable(facing);
    }
}

export function v2f(v: G.V2D): U.O<Facing> {
    if (G.v2d_smells_left(v)) {
        return Facing.left;
    }
    if (G.v2d_smells_right(v)) {
        return Facing.right;
    }
    return undefined;
}

export function x2f(x: number): U.O<Facing> {
    if (x < 0) { 
        return Facing.left;
    }
    if (x > 0) {
        return Facing.right;
    }
    return undefined;
}

export function f2v(facing: Facing): G.V2D {
    return on_facing(
        facing,
        G.v2d_left,
        G.v2d_right
    );
}

export function f2x(facing: Facing): number {
    return on_facing(
        facing,
        -1,
        1
    );
}

export function facing_for_inputs(inputs: Cmd.Inputs): U.O<Facing> {
    if (inputs.commands[Cmd.CommandType.left]) { return Facing.left; }
    if (inputs.commands[Cmd.CommandType.right]) { return Facing.right; }
    return undefined;
}

export function anim_for_facing(images: GDB.ImageResources, facing: Facing, left_anim: A.ResourceAnimator, right_anim: A.ResourceAnimator): A.ResourceAnimator {
    return on_facing(
        facing,
        left_anim,
        right_anim
    );
}
