import * as K from './konfig';
import * as U from './util/util';

// todo: local storage.

export class HighScore {
    constructor(public readonly callsign: string, public readonly score: number) {}
}

const DEFAULT_HIGH_SCORES = [
    new HighScore("JARVIS", 2084),
    new HighScore("YAK", 2020),
    new HighScore("MACLEAN", 2000),
    new HighScore("ERQ ESQ", 1992),
    new HighScore("QYPDQ", 100),
    new HighScore("D N A", 42),
    new HighScore("SPAMSPAM", 3),
    new HighScore("JN0T", 1)
];

export interface HighScores {
    // note: the high score table must never be empty.
    scores: HighScore[]; // sorted high to low.
    get_high_score(): HighScore;
    is_high_score(score: number): boolean;
    maybe_add_score(score: HighScore): void;
}

// todo: persistence!
// note: the high score table must never be empty.
export function high_scores_mk(): HighScores {
    return new class _H implements HighScores {
        scores: HighScore[];
        constructor() {
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
        maybe_add_score(high_score: HighScore) {
            if (high_score.score > 0) {
                this.scores.push(high_score);
                this.scores.sort((a, b) => {
                    return b.score - a.score;
                });
                this.scores = this.scores.slice(0, K.MAX_HIGH_SCORE_COUNT);
            }
        }
    }
}
