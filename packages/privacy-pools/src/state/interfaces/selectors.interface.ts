import { ISecretManager } from "../../account/keys";
import { IDataService } from "../../data/interfaces/data.service.interface";
import { EvmChainId } from "../../types/base";

export interface BaseSelectorParams {
  secretManager: ISecretManager;
  entrypointAddress: (chainId: EvmChainId) => string;
  dataService: IDataService;
}