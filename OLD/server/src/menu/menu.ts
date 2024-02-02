import * as MDB from './menu_db';
import * as Gs from '../game_stepper';

// note: misnomer/alias/synonym for menus AND screens.

export interface Menu extends Gs.Stepper {
    mdb: MDB.MenuDB;
}
