import * as Sz from './sizzler_screen';

export class LevelEndScreen extends Sz.SizzlerScreen {
    constructor(spec: Sz.SizzlerScreenSpec) {
	super({ ...spec, timeout: 10*1000 });
    }
}
