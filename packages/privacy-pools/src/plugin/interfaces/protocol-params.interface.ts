import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { BaseSelectorParams } from "../../state/interfaces/selectors.interface";
import { AssetId, Eip155ChainId } from '@kohaku-eth/plugins';

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: Eip155ChainId) => string;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: BaseSelectorParams) => IStateManager;
}

export interface IStateManager {
  getNote(asset: AssetId, amount: bigint): Note | undefined;
  sync: (chainId: Eip155ChainId, entrypointAddress: string) => Promise<void>;
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
