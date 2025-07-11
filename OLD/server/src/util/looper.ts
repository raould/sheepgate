/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as D from '../debug';

// todo: uh, this is currently not even used any more?

export class Looper<T> {
    index: number;

    constructor(private readonly array: T[]) {
        D.assert(array.length > 0);
        this.index = 0;
    }

    current(): T {
        return this.array[this.index];
    }

    next() {
        this.index = (this.index + 1) % this.array.length;
    }
}
