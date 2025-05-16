import * as G from './geom';
import * as GDB from './game_db';
import * as D from './debug';

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
	D.log("+pgen", dbid);
	this.comment = "particle-generator";
	this.lifecycle = GDB.Lifecycle.alive;
    }
    get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
	const l = this.lifecycle;
	this.lifecycle = GDB.Lifecycle.dead;
	return l;
    }
    on_death(db: GDB.GameDB) {
	D.log("-pgen", this.dbid);
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

