import { Network } from "@kohaku-eth/plugins";
import {
  IQuoteRequest,
  IQuoteResponse,
  IRelayerClient,
  IRelayerFeeResponse,
  IRelayFeesRequest,
  IRelayRequest,
  IRelayRequestBody,
  IRelayResponse,
  ISuccessfullRelayResponse,
} from "./interfaces/relayer-client.interface";
import { toHex } from "viem";
import { addressToHex } from "../utils";

export interface IRelayerClientParams {
  relayerUrl: string;
  network: Network;
}

export class RelayerError extends Error {}

export class RelayerClient implements IRelayerClient {
  private fetch: Network["fetch"];
  private readonly relayerUrl: string;

  constructor({ network: { fetch }, relayerUrl }: IRelayerClientParams) {
    this.fetch = fetch;
    this.relayerUrl = relayerUrl;
  }

  async getQuote({
    asset,
    recipient,
    chainId,
    amount,
    ...body
  }: IQuoteRequest): Promise<IQuoteResponse> {
    const quoteRequest = await this.fetch(`${this.relayerUrl}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            asset: addressToHex(asset),
            recipient: addressToHex(recipient),
            chainId: toHex(chainId),
            amount: toHex(amount),
            ...body,
        })
    })
    return quoteRequest.json();
  }

  async relay({ chainId, scope, ...params}: IRelayRequest): Promise<ISuccessfullRelayResponse> {
    const relayBody: IRelayRequestBody = {
        ...params,
        chainId: toHex(chainId),
        scope: toHex(scope),
    }
    const relayRequest = await this.fetch(`${this.relayerUrl}/request`, {
        method: 'POST',
        body: JSON.stringify(relayBody),
    });

    const response = (await relayRequest.json()) as IRelayResponse;

    if (!response.success) {
        throw new RelayerError(response.error);
    }

    return response;
  }

  async getFees({ assetAddress, chainId }: IRelayFeesRequest): Promise<IRelayerFeeResponse> {
    const feesUrl = new URL(`${this.relayerUrl}/details`);
    feesUrl.searchParams.append('assetAddress', toHex(assetAddress));
    feesUrl.searchParams.append('chainId', chainId.toString(10));

    const feesResponse = await this.fetch(feesUrl);
    return feesResponse.json();
  }
}
