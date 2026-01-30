import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { Eip155ChainId } from '@kohaku-eth/plugins';
import { StoreFactoryParams } from "../../state/state-manager";
import { Address } from "../../interfaces/types.interface";

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: Eip155ChainId) => bigint;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: StoreFactoryParams) => IStateManager;
}

interface IBaseOperationParams {
  chainId: Eip155ChainId;
  entrypointAddress: Address;
}

export type ISyncOperationParams = IBaseOperationParams;
export interface IDepositOperationParams extends IBaseOperationParams {
  assetAddress: Address;
  amount: bigint;
}

export interface IStateManager {
  sync: (params: ISyncOperationParams) => Promise<void>;
  deposit: (chainId: Eip155ChainId) => Promise<void>;
  getBalances: () => Map<Address, bigint>;
}

export type Note = {
  precommitment: bigint;
  label: bigint;
  value: bigint;
  deposit: number;
  withdraw: number;
};
