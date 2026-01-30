import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { Eip155ChainId } from '@kohaku-eth/plugins';
import { StoreFactoryParams } from "../../state/state-manager";
import { Address } from "../../interfaces/types.interface";

export interface PrivacyPoolsV1ProtocolContext { }

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: StoreFactoryParams) => IStateManager;
  chainsEntrypoints: Record<string, bigint>;
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
}

export interface IRelayerConfig {
  url: string;
}

export interface IWithdrawapOperationParams extends Omit<IDepositOperationParams, 'amount'> {
  amount?: bigint;
  recipient: Address;
  relayerConfig: IRelayerConfig;
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
  getDepositPayload: (params: IDepositOperationParams) => Promise<unknown>;
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
