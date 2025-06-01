/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as S from './sprite';
import * as GDB from './game_db';
import * as G from './geom';

export const EmptySprite: S.Sprite = {
    dbid: GDB.MISSING_ID,
    comment: "empty-sprite",
    lt: G.v2d_mk_0(),
    size: G.v2d_mk_0(),
    vel: G.v2d_mk_0(),
    acc: G.v2d_mk_0(),
    alpha: 0,
    get_lifecycle(db: GDB.GameDB) { return GDB.Lifecycle.alive; },
    on_death(db: GDB.GameDB) {},
    step(db: GDB.GameDB) {},
    toJSON() {
        return S.spriteJSON(this);
    }
}
