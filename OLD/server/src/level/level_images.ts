/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';
import * as U from '../util/util';

export function images_mk(index1: number): GDB.ImageResources {
    // todo: templated-per-level images if we never need that.
    return {
        lookup(resource: string): string {
            return `images/${resource}`;
        },
        lookup_range_n(templater: (n: number) => string, start: number, end: number): string[] {
            const resources: string[] = Array
                .from(U.range_cc(start, end))
                .map(n => this.lookup(templater(n)));
            return resources;
        },
        lookup_range_a<T>(templater: (a: T) => string, ts: T[]): string[] {
            const resources: string[] = ts
                .map(t => this.lookup(templater(t)));
            return resources;
        }
    }
}
