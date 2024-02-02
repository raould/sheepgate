import * as D from './debug';

export type Callback = ()=>void;

let next_id: number = 0;

// only the most recent instance of this will be allowed to
// run, any older ones will stop looping. although it doesn't
// in and of itself guarantee the old instances are garbage collected.
export class OnlyOneCallbackTimer {
    id: number;

    constructor(private readonly loop: Callback, private readonly timeout: number) {
        this.id = ++next_id;
        D.log("new OnlyOneCallbackTimer", this.id);
    }

    start() {
        this.run();
    }

    private run() {
        setTimeout(
            () => {
                if (this.id == next_id) {
                    this.loop();
                    this.run();
                }
                else {
                    D.log("exiting OnlyOneCallbackTimer", this.id);
                }
            },
            this.timeout
        );
    }
}
