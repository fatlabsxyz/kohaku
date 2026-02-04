import { Prover } from "@fatsolutions/privacy-pools-core-circuits";
import { Eip155ChainId } from '@kohaku-eth/plugins';
import { TxData } from '@kohaku-eth/provider';
import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { Address } from "../../interfaces/types.interface";
import { IQuoteResponse, IRelayerClient, WithdrawalPayload } from '../../relayer/interfaces/relayer-client.interface';
import { StoreFactoryParams } from "../../state/state-manager";

type ProveOutput = Awaited<ReturnType<Awaited<ReturnType<typeof Prover>>['prove']>>;

export interface PPv1PrivateOperation {
  rawData: {
    proof: ProveOutput;
    withdrawalPayload: WithdrawalPayload;
    chainId: bigint;
    scope: bigint;
  };
  txData: TxData;
  relayData: {
    quote: IQuoteResponse;
    relayerId: string;
  };
}

export interface PrivacyPoolsV1ProtocolContext { }

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: StoreFactoryParams) => IStateManager;
  relayerClientFactory: () => IRelayerClient;
  chainsEntrypoints: Record<string, bigint>;
  relayersList: Record<string, string>;
}

interface IBaseOperationParams {
  chainId: Eip155ChainId<number>;
  entrypoint: Address;
}

export type ISyncOperationParams = IBaseOperationParams;
export interface IDepositOperationParams extends IBaseOperationParams {
  asset: Address;
  amount: bigint;
}

export interface IGetBalancesOperationParams extends IBaseOperationParams {
  assets?: Address[];
  balanceType?: 'approved' | 'unapproved';
}

export interface IWithdrawapOperationParams extends Omit<IDepositOperationParams, 'amount'> {
  amount?: bigint;
  recipient: Address;
}

export interface IRagequitOperationParams extends IBaseOperationParams {
  assets?: Address[];
}

export interface IStateManager {
  /**
   * Queries the chain and updates its state
   */
  sync: (params: ISyncOperationParams) => Promise<void>;
  /**
   * Generates a deposit payload for the signer
   */
  getDepositPayload: (params: IDepositOperationParams) => Promise<TxData>;
  /**
   * Generates the relayer quotes and withdrawals payloads for the specified amount
   */
  getWithdrawalPayloads: (params: IWithdrawapOperationParams) => Promise<unknown[]>;
  /**
   * Generates the ragequit payloads for the specified assets. Only unapproved
   * amount will be ragequitted.
   */
  getRagequitPayloads: (params: IRagequitOperationParams) => Promise<unknown[]>;
  /**
   * Gets the balance of the specified assets.
   * All assets if not specified.
   */
  getBalances: (params: IGetBalancesOperationParams) => Map<Address, bigint>;
}

export type Note = {
  precommitment: bigint;
  label: bigint;
  value: bigint;
  deposit: number;
  withdraw: number;
};
