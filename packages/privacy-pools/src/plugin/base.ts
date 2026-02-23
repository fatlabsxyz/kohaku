import { Prover } from "@fatsolutions/privacy-pools-core-circuits";
import { encodeWithdrawalPayload } from "../utils.js";
import { AccountId, AssetAmount, ERC20AssetId, Host, MultiAssetsNotSupportedError, PublicOperation } from "@kohaku-eth/plugins";
import { ISecretManager, SecretManager } from '../account/keys';
import { AspService } from "../data/asp.service";
import { DataService } from '../data/data.service';
import { IRelayerClient } from "../relayer/interfaces/relayer-client.interface";
import { RelayerClient } from "../relayer/relayer-client";
import { storeStateManager } from '../state/state-manager';
import { IEntrypoint, INote, IStateManager, PPv1PrivateOperation, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';
import { PPv1AssetAmount, PPv1Instance } from "../v1/instance.js";
import { TxData } from "@kohaku-eth/provider";
import { PPv1Broadcaster, PPv1BroadcasterParameters } from "../v1/interfaces.js";

export interface PPV1PublicOperation extends PublicOperation {
  txns: TxData[];
}

type RequireOnly<T, Keys extends keyof T> = Partial<T> & Pick<T, Keys>;

interface PPv1RelayerConstructorParams {
  relayerClientFactory?: () => IRelayerClient;
  host: Host;
}

export class PrivacyPoolsBroadcaster implements PPv1Broadcaster {
  relayersList: Record<string, string> = {};
  private relayerClient: IRelayerClient;

  constructor({
    host,
    relayerClientFactory = () => new RelayerClient({ network: host.network }),
  }: PPv1RelayerConstructorParams) {
    this.relayerClient = relayerClientFactory();
  }

  private parseRelayers(params: PPv1BroadcasterParameters['broadcasterUrl']) {
    return typeof params === 'string' ? { default: params } : params;
  }

  async config(params: PPv1BroadcasterParameters) {
    this.relayersList = this.parseRelayers(params.broadcasterUrl);
  };

  async broadcast({
    rawData: {
      chainId,
      scope,
      proof: {
        proof,
        publicSignals
      },
      withdrawalPayload
    },
    quoteData: {
      relayerId,
      quote: {
        feeCommitment,
      }
    }
  }: PPv1PrivateOperation): Promise<void> {
    const relayerUrl = this.relayersList[relayerId];

    if (!relayerUrl) {
      throw new Error('Specified relayer not found.');
    }

    await this.relayerClient.relay({
      chainId,
      scope,
      feeCommitment,
      relayerUrl,
      withdrawal: withdrawalPayload,
      publicSignals,
      proof
    });

    return void 0;
  }

}

export class PrivacyPoolsV1Protocol implements PPv1Instance {
  private accountIndex: number;
  private secretManager: ISecretManager;
  private stateManager: IStateManager;
  private entrypoint: IEntrypoint;
  private relayersList: Map<string, string>;
  private relayerClient: IRelayerClient;

  constructor(readonly host: Host,
    {
      initialState = {},
      secretManager = SecretManager,
      stateManager: stateManagerFactory = storeStateManager,
      entrypoint,
      relayersList = {},
      aspServiceFactory = () => new AspService({ network: host.network }),
      relayerClientFactory = () => new RelayerClient({ network: host.network }),
      proverFactory = Prover,
    }: RequireOnly<PrivacyPoolsV1ProtocolParams, 'entrypoint'>) {
    this.accountIndex = 0;
    this.entrypoint = entrypoint;
    this.relayersList = new Map(Object.entries(relayersList));
    this.relayerClient = relayerClientFactory();
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManagerFactory({
      initialState: { ...initialState },
      secretManager: this.secretManager,
      aspService: aspServiceFactory(),
      dataService: new DataService({ provider: host.ethProvider }),
      relayerClient: this.relayerClient,
      relayersList: this.relayersList,
      proverFactory,
      storageToSyncTo: host.storage,
      entrypoint
    });
  }

  instanceId = () => Promise.resolve('0x1' as const);

  prepareShieldMulti() {
    return Promise.reject(new MultiAssetsNotSupportedError());
  };

  prepareUnshieldMulti() {
    return Promise.reject(new MultiAssetsNotSupportedError());
  }

  /**
   * Only process supported assets or error out?
   * Returns the balances of the requested assets.
   * The assets retain the provided order. If an asset is not supported its balance will be 0
   */
  async balance(assets: ERC20AssetId[] = [],
    balanceType: 'approved' | 'unapproved' = 'approved'
  ): Promise<AssetAmount[]> {
    await this.stateManager.sync();
    const parsedAssets = assets.map(({ contract }) => BigInt(contract))

    const balances = await this.stateManager.getBalances({
      balanceType,
      assets: assets.length > 0 ? parsedAssets : undefined,
    });

    return assets.map((asset, index) => ({
      asset,
      amount: balances.get(parsedAssets[index]!) || 0n
    }));
  }

  async prepareShield(assets: PPv1AssetAmount, from?: AccountId): Promise<PPV1PublicOperation> {
    const { asset, amount } = assets;

    await this.stateManager.sync();

    const tx = await this.stateManager.getDepositPayload({
      asset: BigInt(asset.contract),
      amount,
    });

    return { txns: [tx] } as PPV1PublicOperation;
  }

  /**
   * Returns all notes for the account.
   * @param assets - Filter by specific assets (optional, if empty returns all chains)
   * @param includeSpent - Include notes with zero balance (default: false)
   */
  async notes(
    assets: ERC20AssetId[] = [],
    includeSpent = false
  ): Promise<INote[]> {
    await this.stateManager.sync();

    const assetsAddresses = assets.map(({ contract }) => BigInt(contract));

    return this.stateManager.getNotes({
      includeSpent,
      assets: assetsAddresses.length > 0 ? assetsAddresses : undefined,
    });
  }

  async prepareUnshield(assets: AssetAmount, to: AccountId): Promise<PPv1PrivateOperation> {
    const { asset, amount } = assets;
    const entrypoint = this.entrypoint;
    const assetAddress = BigInt(asset.contract);

    await this.stateManager.sync();;

    const [result] = await this.stateManager.getWithdrawalPayloads({
      asset: assetAddress,
      amount,
      recipient: BigInt(to),
    });

    if (!result)
      throw new Error("We failed to create a withdrawalPayload");

    const {
      proofResult,
      quoteData,
      withdrawalInfo: {
        scope,
        relayDataObject,
        context,
        withdrawalObject
      },
      chainId
    } = result;

    const rawData = {
      context,
      relayData: relayDataObject,
      proof: proofResult,
      withdrawalPayload: withdrawalObject,
      chainId,
      scope,
    };

    const encodedWithdrawalData = encodeWithdrawalPayload(withdrawalObject, proofResult, scope);

    return {
      rawData,
      txData: {
        to: `0x${entrypoint.address.toString(16).padStart(40, '0')}`,
        data: encodedWithdrawalData, // TODO: encode actual withdrawal call
        value: 0n,
      },
      quoteData,
    } as PPv1PrivateOperation;
  }

  broadcast(operation: PPv1PrivateOperation): Promise<void> {
    throw new Error("Method not implemented.");
  }

  sync() {
    return this.stateManager.sync();
  }

  dumpState() {
    return this.stateManager.dumpState();
  }

}
