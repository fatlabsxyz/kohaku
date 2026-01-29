import { Eip155ChainId } from "@kohaku-eth/plugins";
import { ISecretManager } from "../../account/keys";
import { IDataService } from "../../data/interfaces/data.service.interface";

export interface BaseSelectorParams {
  secretManager: ISecretManager;
  entrypointAddress: (chainId: Eip155ChainId) => string;
  dataService: IDataService;
}