/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as G from './geom';
import * as GDB from './game_db';

// todo: kinda arbitrary units, maybe pixels/msec or something!?
export interface IParticleGenerator extends GDB.Item {
    isEightGrid: boolean;
    duration_msec: number;
    bounds: G.Rect;
    count: number;
    speed: number;
}

export class ParticleGenerator implements IParticleGenerator {
    comment: string;
    lifecycle: GDB.Lifecycle;
    constructor(
	public dbid: GDB.DBID,
	public isEightGrid: boolean, // defendery style explosions.
	public duration_msec: number,
	public bounds: G.Rect,
	public count: number,
	public speed: number) {
	this.comment = `particle-generator-${dbid}`;
	this.lifecycle = GDB.Lifecycle.alive;
    }
    get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
	const l = this.lifecycle;
	this.lifecycle = GDB.Lifecycle.dead;
	return l;
    }
    on_death(db: GDB.GameDB) {
    }
}

export class ParticleEllipseGenerator extends ParticleGenerator {
    constructor(
	public dbid: GDB.DBID,
	public duration_msec: number,
	public bounds: G.Rect,
	public count: number,
	public speed: number) {
	super(dbid, false, duration_msec, bounds, count, speed);
    }
}
    
export class ParticleEightGenerator extends ParticleGenerator {
    constructor(
	public dbid: GDB.DBID,
	public duration_msec: number,
	public bounds: G.Rect,
	public count: number,
	public speed: number) {
	super(dbid, true, duration_msec, bounds, count, speed);
    }
}

