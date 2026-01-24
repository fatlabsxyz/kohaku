import { ISecretManager } from "../../account/keys";
import { ChainId } from "../../types/base";

export interface BaseSelectorParams {
  secretManager: ISecretManager;
  entrypointAddress: (chainId: ChainId) => string;
}