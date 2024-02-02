import * as Cmd from './commands';

// represent what we get from the client.
// note: ironically this type isn't ever used on the client side todo: yet.

export interface ClientDB {
    client_id: number;
    inputs: Cmd.Inputs;
    debugging_state: { is_stepping: boolean, is_drawing: boolean };
}