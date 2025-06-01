/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Rnd from '../random';

export function shuffle_array<E>(array: Array<E>, rnd: Rnd.Random = Rnd.singleton): Array<E> {
    const a2 = array.slice();
    for (let i = a2.length - 1; i > 0; --i) {
	const j = Math.floor(rnd.float_0_1() * (i+1));
	const ti = a2[i];
	const tj = a2[j];
	a2[i] = tj;
	a2[j] = ti;
    }
    return a2;
}
