import * as K from './konfig';
import * as G from './geom';
import * as GDB from './game_db';
import * as U from './util/util';
import * as Dr from './drawing';
import { RGBA } from './color';

export interface Toast extends GDB.Steps, GDB.Item {
    lb: G.V2D;
    msg: string;
    lifetime: number;
    to_drawing: () => Dr.DrawText;
}

export interface ToastSpec {
    lb: G.V2D;
    msg: string;
    lifetime: number;
}

export function add_toast(db: GDB.GameDB, spec: ToastSpec) {
    GDB.add_dict_id_mut(
	db.local.toasts,
	(dbid: GDB.DBID) => {
	    const t: Toast = {
		dbid,
		comment: `toast-${dbid}`,
		lb: spec.lb,
		msg: spec.msg,
		lifetime: spec.lifetime,
		get_lifecycle(db: GDB.GameDB) {
		    return this.lifetime > 0 ? GDB.Lifecycle.alive : GDB.Lifecycle.dead;
		},
		step(db: GDB.GameDB) {
		    if (this.lifetime > 0) {
			this.lifetime -= db.local.frame_dt;
			this.lb.y -= 2; // yay hard-coded magic values!
		    }
		},
		to_drawing(): Dr.DrawText {
		    return {
			text: this.msg,
			wrap: true,
			lb: this.lb,
			font: `40px ${K.MENU_FONT}`,
			fillStyle: RGBA.GREEN.setAlpha01(
			    U.t01(0, spec.lifetime, this.lifetime)
			),
		    };
		},
	    };
	    return t;
	}
    );
}
