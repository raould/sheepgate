/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */

export const assertionsEnabled: boolean = (() => {
    const is_node = typeof process !== "undefined";
    return is_node && process.env.GAME_DEBUG == "1";
})();

export function time_str(date: Date): string {
    return date.toLocaleTimeString('en-US', { hour12: false });
}
export function now_str(): string {
    return time_str(new Date());
}
export function log_stamp(...args: any) {
    console.log(now_str(), ...args);
}
export function warn_stamp(...args: any) {
    console.warn(now_str(), ...args);
}
export function error_stamp(...args: any) {
    console.error(now_str(), ...args);
}

let debug_this_step = false;
export function debug_step_enable() {
    debug_this_step = true;
}
export function debug_step_cancel() {
    debug_this_step = false;
}
export function log_step(...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    if (debug_this_step) {
        log_stamp(...args);
    }
}

export function error(...args: any) {
    error_stamp(...args);
}

export function warn(...args: any) {
    warn_stamp(...args);
}

export function log(...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    log_stamp(...args);
}

export function log_if(test: boolean, ...args: any) {
    // todo: ifdef this to be quiet on 'release' builds somehow.
    if (test) {
        log_stamp(...args);
    }
}

const seen = new Set<string>();
export function log_once(key: string, ...args: any) {
    if (!seen.has(key)) {
	seen.add(key);
	log(key, ...args);
    }
}

function msgs2strs(...msgs: any): string {
    if (msgs == undefined) {
	return "";
    }
    else if (msgs.length === 0) {
        return "";
    }
    else {
        return msgs.flatMap((m: any) => {
	    if (m instanceof Function) {
		return String(m());
	    }
	    else {
		return String(m);
	    }
	});
    }
}

export function assert_fail(...msgs: any) {
    if (assertionsEnabled) {
	const strs = msgs2strs(msgs);
	log_stamp(
            "ASSERTION FAILED:",
	    ...strs,
            "\n",
            new Error().stack
	);
    }
}

export function assert(test: boolean, ...msgs: any) {
    if (assertionsEnabled) {
	if (!test) {
            assert_fail(...msgs);
	}
    }
}

export function assert_fn(a: any, b: any, compare: (a:any, b:any)=>boolean, ...msgs: any) {
    if (assertionsEnabled) {
	const eq = compare(a, b);
	if (!eq) {
            assert_fail(...msgs, a, b);
	}
    }
}

export function assert_eqeq(a: any, b: any, ...msgs: any) {
    if (assertionsEnabled) {
	if (a !== b) {
            assert_fail(...msgs, a, b);
	}
    }
}
