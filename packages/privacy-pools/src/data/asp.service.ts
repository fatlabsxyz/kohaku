import { Network } from "@kohaku-eth/plugins";

export class AspService {
    private providerUrl = 'https://ipfs.io/ipfs/';
    private fetch: Network['fetch'];

    constructor({fetch}: Network) {
        this.fetch = fetch;
    }

    async getAspTree(ipfsCID: string): Promise<bigint[][]> {
        const response = await this.fetch(`${this.providerUrl}${ipfsCID}`);

        return response.json();
    }
}
