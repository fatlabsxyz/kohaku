import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { AssetId, Eip155ChainId } from '@kohaku-eth/plugins';
import { StoreFactoryParams } from "../../state/state-manager";

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: Eip155ChainId) => bigint;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: StoreFactoryParams) => IStateManager;
}

export interface IStateManager {
  getNote(asset: AssetId, amount: bigint): Note | undefined;
  sync: (chainId: Eip155ChainId, entrypointAddress: bigint) => Promise<void>;
  getDepositCount: (chainId: Eip155ChainId) => Promise<number>;
  getBalance: (asset: AssetId) => string;
}

export type Note = {
  precommitment: bigint;
  label: bigint;
  value: bigint;
  deposit: number;
  withdraw: number;
};
