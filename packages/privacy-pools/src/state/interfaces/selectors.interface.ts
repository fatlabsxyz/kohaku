import { ISecretManager } from "../../account/keys";
import { DataService } from "../../data/data.service";
import { EvmChainId } from "../../types/base";

export interface BaseSelectorParams {
  secretManager: ISecretManager;
  entrypointAddress: (chainId: EvmChainId) => string;
  dataService: DataService;
}