import * as G from './geom';
import * as GDB from './game_db';
import * as D from './debug';

export interface ParticleGenerator extends GDB.Item {
    start_msec: number;
    duration_msec: number;
    bounds: G.Rect;
    count: number;
    speed: number; // kinda arbitrary units. pixels/msec maybe?!
    gravity: number; // kinda arbitrary units!?
}

export class ParticleEllipseGenerator implements ParticleGenerator {
    // todo: use some DAO interface spec boilerplate reduction style?
    dbid: GDB.DBID;
    comment: string;
    start_msec: number;
    duration_msec: number;
    bounds: G.Rect;
    count: number;
    speed: number; 
    vel: G.V2D;
    // todo: gravity is a hack, ie no idea what the units of measure are.
    gravity: number;
    constructor(dbid: GDB.DBID, start_msec: number, duration_msec: number, bounds: G.Rect, count: number, speed: number, vel: G.V2D, gravity: number = 0) {
        this.dbid = dbid;
        this.comment = "particles";
        this.start_msec = start_msec;
        this.duration_msec = duration_msec;
        this.bounds = bounds;
        this.count = count;
        this.speed = speed;
        this.vel = vel;
        this.gravity = gravity;
    }
    get_lifecycle(db: GDB.GameDB): GDB.Lifecycle {
        const alive = db.shared.sim_now - this.start_msec <= this.duration_msec;
        return alive ? GDB.Lifecycle.alive : GDB.Lifecycle.reap;
    }
    on_death(_: GDB.GameDB) {}
}