import { ISecretManager, SecretManagerParams } from "../../account/keys";
import { BaseSelectorParams } from "../../state/interfaces/selectors.interface";
import { AssetId, ChainId } from "../../types/base";

export interface PrivacyPoolsV1ProtocolContext {
  entrypointAddress: (chainId: ChainId) => string;
}

export interface PrivacyPoolsV1ProtocolParams {
  context: PrivacyPoolsV1ProtocolContext;
  secretManager: (params: SecretManagerParams) => ISecretManager;
  stateManager: (params: BaseSelectorParams) => IStateManager;
}

export interface IStateManager {
  sync: () => Promise<void>;
  getDepositCount: () => Promise<number>;
  getBalance: (asset: AssetId) => string;
}