import * as GDB from './game_db';
import * as U from './util/util';
import * as D from './debug';

// i guess there will be
// one Scoring instance
// per player,
// and per level to allow
// for customization per level
// e.g. scaling the score up
// as levels go up.

export enum Event {
    FIRST,
    rescue = FIRST,
    easy_defeat,
    medium_defeat,
    hard_defeat,
    boss_defeat,
    // actually i've decided no points for pickup,
    // otherwise it can get stressful for some players
    // if the level ends before they can pick them all up.
    gem_pickup,
    // remember to update this, duh.
    // (wow i kinda hate typescript.)
    LAST = gem_pickup
}

export interface Scoring {
    score: number;
    on_event(event: Event): void;
    step(db: GDB.GameDB): void; // mainly for drawing.
}

interface ScoringPrivate extends Scoring {
    // this is just horrible: i am using Map because
    // (a) it lets me use non-strings as keys, i hope,
    // and (b) it actually does not serialize through JSON
    // which in this case is a good thing because i don't
    // want to spam the client with the table.
    e2s: Map<Event,number>;
    event2score(event: Event): number;
}

export function scoring_mk(score: number, e2s: Map<Event,number>): Scoring {
    D.assert_eqeq(e2s.size, Event.LAST + 1);
    const s: ScoringPrivate = {
        score: score,
        e2s: e2s,
        on_event(event: Event) {
            const delta = this.event2score(event);
            D.log("score", this.score, delta);
            this.score += delta;
        },
        event2score(event: Event): number {
            const score: U.O<number> = this.e2s.get(event);
            return score ?? 0;
        },
        step(db: GDB.GameDB) {},
    }
    return s;
}
