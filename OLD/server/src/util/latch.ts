/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
export class Latch<T> {
    
    latched: boolean;
    value: T;

    constructor(value: T, private readonly latch_on: T[]) {
        this.latched = false;
        this.value = value;
    }
    set_value(value: T) {
        if (!this.latched) {
            this.value = value;
            if (this.latch_on.includes(value)) {
                this.latched = true;
            }
        }
    }
}
