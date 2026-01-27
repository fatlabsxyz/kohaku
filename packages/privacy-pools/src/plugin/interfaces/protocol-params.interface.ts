import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { BaseSelectorParams } from "../../state/interfaces/selectors.interface";
import { EvmChainId } from "../../types/base";
import { AssetId } from '@kohaku-eth/plugins';

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: EvmChainId) => string;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: BaseSelectorParams) => IStateManager;
}

export interface IStateManager {
  getNote(asset: AssetId, amount: bigint): Note | undefined;
  sync: (chainId: EvmChainId, entrypointAddress: string) => Promise<void>;
  getDepositCount: (chainId: EvmChainId) => Promise<number>;
  getBalance: (asset: AssetId) => string;
}

export type Note = {
  precommitment: bigint;
  label: bigint;
  value: bigint;
  deposit: number;
  withdraw: number;
};

