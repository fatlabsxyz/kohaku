import { ISecretManager } from "../../account/keys";
import { DataService } from "../../data/data.service";
import { ChainId } from "../../types/base";

export interface BaseSelectorParams {
  secretManager: ISecretManager;
  entrypointAddress: (chainId: ChainId) => string;
  dataService: DataService;
}