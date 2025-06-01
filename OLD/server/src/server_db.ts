/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from './game_db';
import * as MDB from './menu/menu_db';

// not the same as the other dbs, it wraps them instead.
export interface ServerDB {
    game_db? :GDB.GameDB;
    menu_db?: MDB.MenuDB;
}
