declare module 'circomlib' {
    export const pedersenHash: {
        hash(data: Buffer): Buffer;
    };
    export const babyJub: {
        unpackPoint(point: Buffer): any[];
    };
}