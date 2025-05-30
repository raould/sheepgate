/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as MDB from './menu_db';
import * as Gs from '../game_stepper';

// note: misnomer/alias/synonym for menus AND screens.

export interface Menu extends Gs.Stepper {
    mdb: MDB.MenuDB;
}
