import { EvmChainId } from "packages/provider/dist";
import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { BaseSelectorParams } from "../../state/interfaces/selectors.interface";
import { AssetId } from "../../types/base";

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: EvmChainId) => string;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: BaseSelectorParams) => IStateManager;
}

export interface IStateManager {
  sync: (chainId: EvmChainId, entrypointAddress: string) => Promise<void>;
  getDepositCount: (chainId: EvmChainId) => Promise<number>;
  getBalance: (asset: AssetId) => string;
}