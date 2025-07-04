/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as K from './konfig';
import * as D from './debug';
import * as U from './util/util';

// todo: local storage.

export class HighScore {
    constructor(public readonly callsign: string, public readonly score: number) {}
}

let DEFAULT_HIGH_SCORES = [
    new HighScore("JARVIS", 2084),
    new HighScore("YAK", 2020),
    new HighScore("MACLEAN", 2000),
    new HighScore("ERQ ESQ", 1992),
    new HighScore("QYPDQ", 100),
    new HighScore("D N A", 42),
    new HighScore("SPAM", 3),
    new HighScore("JN0T", 1)
];

// todo: persistence!
// note: the high score table must never be empty.
export class HighScores {
    scores: HighScore[];

    constructor(private isAttract:boolean = false) {
        this.scores = [];
        DEFAULT_HIGH_SCORES.forEach(hs => this.maybe_add_score(hs));
    }

    get_high_score(): HighScore {
        return this.scores[0];
    }

    is_high_score(score: number): boolean {
        return U.if_let_safe(
            U.element_looped(this.scores, -1),
            hs => hs.score < score,
            () => false
        );
    }

    trim() {
	this.scores.sort((a, b) => {
            return b.score - a.score;
        });
        this.scores = this.scores.slice(0, K.MAX_HIGH_SCORE_COUNT);
    }

    maybe_add_score(high_score: HighScore) {
        if (!this.isAttract && high_score.score > 0) {
            this.scores.push(high_score);
	    this.trim();
        }
    }

    set_scores_from_json(json: string) {
	try {
	    const table = JSON.parse(json);
	    this.scores = table.map((r: any) => new HighScore(r.callsign, r.score));
	    this.trim();
	}
	catch (err) {
	    D.error(err);
	}
    }

    toJSON(): string {
	return JSON.stringify(this.scores);
    }
}
