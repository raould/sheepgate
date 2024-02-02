import * as GDB from '../game_db';

export function images_mk(index1: number): GDB.SoundResources {
    return {
        lookup(resource: string): string { return resource; }
    }
}