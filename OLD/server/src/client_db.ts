/* Copyright (C) 2024-2025 raould@gmail.com License: GPLv2 / GNU General. Public License, version 2. https://www.gnu.org/licenses/old-licenses/gpl-2.0.en.html */
import * as Cmd from './commands';

// represent what we get from the client.
// note: ironically this type isn't ever used on the client side todo: yet.

export interface ClientDB {
    client_id: number;
    inputs: Cmd.Inputs;
    // match: client.
    debugging_state: { is_stepping: boolean, is_drawing: boolean, is_annotating: boolean };
    storage_json?: string | undefined;
}
