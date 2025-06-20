export function eqf(fa: number, fb: number, epsilon: number = Number.EPSILON): boolean {
    return Math.abs(fa-fb) <= epsilon;
}
