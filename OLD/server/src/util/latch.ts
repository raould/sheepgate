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
