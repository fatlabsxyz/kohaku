export class AspService {
    private providerUrl = 'https://ipfs.io/ipfs/';

    constructor(private fetch: typeof globalThis.fetch) {}

    async getApprovedDeposits(ipfsCID: string): Promise<BigInt[][]> {
        const response = await this.fetch(`${this.providerUrl}${ipfsCID}`);
        return response.json();
    }
}