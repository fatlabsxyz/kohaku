import {
  IQuoteResponse,
  IRelayerClient,
  IRelayFeesRequest,
  IRelayerFeeResponse,
  IQuoteRequest,
  IRelayRequest,
  ISuccessfullRelayResponse,
} from '../../src/relayer/interfaces/relayer-client.interface';

export interface MockRelayerOptions {
  feeBPS?: string;
  baseFeeBPS?: string;
  gasPrice?: string;
  shouldFail?: boolean;
}

export const createMockRelayerClient = (options: MockRelayerOptions = {}): IRelayerClient => {
  const {
    feeBPS = '100',        // 1%
    baseFeeBPS = '50',     // 0.5%
    gasPrice = '1000000000', // 1 gwei
    shouldFail = false,
  } = options;

  return {
    async getQuote(body: IQuoteRequest): Promise<IQuoteResponse> {
      if (shouldFail) {
        throw new Error('Mock relayer failed');
      }

      return {
        baseFeeBPS,
        feeBPS,
        gasPrice,
        feeCommitment: {
          expiration: Date.now() + 3600000, // 1 hour from now
          withdrawalData: '0x',
          signedRelayerCommitment: '0xmocksignature',
          extraGas: body.extraGas,
        },
        detail: {
          relayTxCost: { gas: '100000', eth: '100000000000000' },
        },
      };
    },

    async relay(body: IRelayRequest): Promise<ISuccessfullRelayResponse> {
      if (shouldFail) {
        throw new Error('Mock relay failed');
      }

      return {
        success: true,
        timestamp: Date.now(),
        requestId: 'mock-request-id',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      };
    },

    async getFees(body: IRelayFeesRequest): Promise<IRelayerFeeResponse> {
      return {
        feeBPS,
        feeReceiverAddress: '0x0000000000000000000000000000000000000001',
        chainId: Number(body.chainId),
        assetAddress: String(body.assetAddress),
        minWithdrawAmount: '1000000000000000', // 0.001 ETH
        maxGasPrice: '100000000000', // 100 gwei
      };
    },
  };
};
