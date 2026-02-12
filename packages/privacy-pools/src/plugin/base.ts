import { Prover } from "@fatsolutions/privacy-pools-core-circuits";
import { encodeWithdrawalPayload } from "../utils.js";
import { AccountId, AssetAmount, AssetId, ChainId, Eip155ChainId, Erc20Id, Host, Plugin, ShieldPreparation } from "@kohaku-eth/plugins";
import { ISecretManager, SecretManager } from '../account/keys';
import { AspService } from "../data/asp.service";
import { DataService } from '../data/data.service';
import { IQuoteResponse, IRelayerClient } from "../relayer/interfaces/relayer-client.interface";
import { RelayerClient } from "../relayer/relayer-client";
import { storeStateManager } from '../state/state-manager';
import { IEntrypoint, INote, IStateManager, ISyncOperationParams, PPv1PrivateOperation, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';

const DefaultContext: PrivacyPoolsV1ProtocolContext = {};

const chainIsEvmChain = (chainId: ChainId): chainId is Eip155ChainId =>
  chainId.namespace === 'eip155';

const getAssetAddress = (assetId: AssetId) => BigInt((assetId as Erc20Id).reference || 0n);

export class PrivacyPoolsV1Protocol extends Plugin<
  AssetAmount,
  ShieldPreparation,
  PPv1PrivateOperation
> {
  private accountIndex: number;
  private secretManager: ISecretManager;
  private stateManager: IStateManager;
  private context: PrivacyPoolsV1ProtocolContext;
  private chainsEntrypoints: Map<string, IEntrypoint>;
  private relayersList: Map<string, string>;
  private relayerClient: IRelayerClient;

  constructor(readonly host: Host,
    {
      context = DefaultContext,
      initialState = {},
      secretManager = SecretManager,
      stateManager: stateManagerFactory = storeStateManager,
      chainsEntrypoints = {},
      relayersList = {},
      relayerClientFactory = () => new RelayerClient({ network: host.network }),
      aspServiceFactory = () => new AspService({ network: host.network}),
      proverFactory = Prover,
    }: Partial<PrivacyPoolsV1ProtocolParams> = {}) {
    super();
    this.context = context;
    this.accountIndex = 0;
    this.chainsEntrypoints = new Map(Object.entries(chainsEntrypoints));
    this.relayersList = new Map(Object.entries(relayersList));
    this.relayerClient = relayerClientFactory();
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManagerFactory({
      initialState,
      secretManager: this.secretManager,
      aspService: aspServiceFactory(),
      dataService: new DataService({ provider: host.ethProvider }),
      relayerClient: this.relayerClient,
      relayersList: this.relayersList,
      proverFactory,
      storageToSyncTo: host.storage,
    });
  }

  account(): Promise<AccountId> {
    throw new Error("Method not implemented.");
  }

  /**
   * Only process supported assets or error out?
   * Returns the balances of the requested assets.
   * The assets retain the provided order. If an asset is not supported its balance will be 0
   */
  async balance(assets: AssetId[] = [],
    balanceType: 'approved' | 'unapproved' = 'approved'
  ): Promise<AssetAmount[]> {
    const evmAssets = assets.filter(({ chainId }) => chainIsEvmChain(chainId)) as (AssetId & { chainId: Eip155ChainId<number>; })[];

    // Map keys are unique so only distinct chains will remain
    const chainsRequested = new Map(evmAssets.map(({ chainId }) => [chainId.toString(), chainId]));
    const assetsByChain = evmAssets.reduce((assetsByChain, asset) => {
      const assetChain = asset.chainId.toString();

      assetsByChain[assetChain] = [...(assetsByChain[assetChain] || []), asset];

      return assetsByChain;
    }, {} as Record<string, AssetId[]>);

    const balances = await Promise.all(Array.from(chainsRequested).map(async ([chainIdString, chainId]) => {
      const params: ISyncOperationParams = {
        chainId,
        entrypoint: this.chainsEntrypoints.get(chainIdString)!
      };

      await this.stateManager.sync(params);

      const balancesMap = this.stateManager.getBalances({
        ...params,
        balanceType,
        assets: assetsByChain[chainIdString]?.map(getAssetAddress),
      });

      return { [chainIdString]: balancesMap };
    }));

    const balancesByChain = balances.reduce((balanceByChain, chainBalance) => {
      return {
        ...balanceByChain,
        ...chainBalance,
      };
    }, {});

    return assets.map((asset) => {
      return {
        asset,
        amount: balancesByChain[asset.chainId.toString()]?.get(getAssetAddress(asset)) || 0n
      };
    });
  }

  override async broadcastPrivateOperation({
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
    const relayerUrl = this.relayersList.get(relayerId);

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

  async prepareShield(assets: { asset: AssetId, amount: bigint; }, from?: AccountId): Promise<ShieldPreparation> {
    const { asset, amount } = assets;
    const { chainId: _chainId } = asset;

    if (!chainIsEvmChain(_chainId)) {
      throw new Error("Only EVM assets are supported");
    }

    const chainId = _chainId as Eip155ChainId<number>;
    const entrypoint = this.chainsEntrypoints.get(chainId.toString());

    if (!entrypoint) {
      throw new Error(`No entrypoint configured for chain ${chainId.toString()}`);
    }

    await this.stateManager.sync({ chainId, entrypoint });

    const tx = await this.stateManager.getDepositPayload({
      chainId,
      entrypoint,
      asset: getAssetAddress(asset),
      amount,
    });

    return { txns: [tx] };
  }

  /**
   * Returns all notes for the account.
   * @param assets - Filter by specific assets (optional, if empty returns all chains)
   * @param includeSpent - Include notes with zero balance (default: false)
   */
  async notes(
    assets: AssetId[] = [],
    includeSpent = false
  ): Promise<INote[]> {
    const evmAssets = assets.filter(({ chainId }) => chainIsEvmChain(chainId)) as (AssetId & { chainId: Eip155ChainId<number>; })[];

    // If assets specified, get unique chains from them
    // Otherwise, iterate all configured chains
    const chainsToQuery = evmAssets.length > 0
      ? [...new Set(evmAssets.map(a => a.chainId.toString()))]
      : [...this.chainsEntrypoints.keys()];

    const allNotes: INote[] = [];

    for (const chainIdStr of chainsToQuery) {
      const entrypoint = this.chainsEntrypoints.get(chainIdStr);

      if (!entrypoint) continue;

      // Parse chain ID (format: "eip155:1")
      const chainId = new Eip155ChainId(parseInt(chainIdStr.split(':')[1] ?? '1'));

      await this.stateManager.sync({ chainId, entrypoint });

      const chainAssets = evmAssets
        .filter(a => a.chainId.toString() === chainIdStr)
        .map(getAssetAddress);

      const notes = this.stateManager.getNotes({
        chainId,
        entrypoint,
        includeSpent,
        assets: chainAssets.length > 0 ? chainAssets : undefined,
      });

      allNotes.push(...notes);
    }

    return allNotes;
  }

  async prepareUnshield(assets: AssetAmount, to: AccountId): Promise<PPv1PrivateOperation> {
    const { asset, amount } = assets;
    const { chainId: _chainId } = asset;

    if (!chainIsEvmChain(_chainId)) {
      throw new Error("Only EVM assets are supported");
    }

    const chainId = _chainId as Eip155ChainId<number>;
    const entrypoint = this.chainsEntrypoints.get(chainId.toString());

    if (!entrypoint) {
      throw new Error(`No entrypoint configured for chain ${chainId.toString()}`);
    }

    await this.stateManager.sync({ chainId, entrypoint });

    // Convert AccountId to Address
    // AccountId format is "eip155:chainId:address" or has an address property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toAny = to as any;
    const recipientAddress = toAny.address
      ? BigInt(toAny.address)
      : BigInt(String(to).split(':').pop() || '0');

    const [result] = await this.stateManager.getWithdrawalPayloads({
      chainId,
      entrypoint,
      asset: getAssetAddress(asset),
      amount,
      recipient: recipientAddress,
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
      }
    } = result;

    const rawData = {
      context,
      relayData: relayDataObject,
      proof: proofResult,
      withdrawalPayload: withdrawalObject,
      chainId: BigInt(chainId.reference),
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
    };
  }

  broadcast(operation: PPv1PrivateOperation): Promise<void> {
    throw new Error("Method not implemented.");
  }

  dumpState() {
    return this.stateManager.dumpState();
  }

}
