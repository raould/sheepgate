/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as GDB from '../game_db';

export function images_mk(index1: number): GDB.SoundResources {
    return {
        lookup(resource: string): string { return resource; }
    }
}
