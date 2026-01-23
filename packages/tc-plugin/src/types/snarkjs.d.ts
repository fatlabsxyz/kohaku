declare module 'snarkjs' {
    export interface BigInt {
        leInt2Buff(bytes: number): Buffer;
        toString(base?: number): string;
    }

    export const bigInt: {
        leBuff2int(buf: Buffer): BigInt;
        (value: string | number | Buffer): BigInt;
    };

    export const groth16: any;
}