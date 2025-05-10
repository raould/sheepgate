import * as GDB from '../game_db';
import * as S from '../sprite';
import * as G from '../geom';
import * as U from '../util/util';

export type Warpin_Mk = (db: GDB.GameDB) => U.O<S.Warpin>;

export interface EnemyMk {
    warpin_mk: Warpin_Mk;
    SIZE: G.V2D;
    WARPIN_RESOURCE_ID: string,
}

