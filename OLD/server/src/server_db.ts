import * as GDB from './game_db';
import * as MDB from './menu/menu_db';

// not the same as the other dbs, it wraps them instead.
export interface ServerDB {
    game_db? :GDB.GameDB;
    menu_db?: MDB.MenuDB;
}
