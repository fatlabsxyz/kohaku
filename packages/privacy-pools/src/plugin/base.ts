import { AccountId, AssetAmount, AssetId, ChainId, Eip155ChainId, Erc20Id, Host, Plugin, PrivateOperation, ShieldPreparation } from "@kohaku-eth/plugins";
import { ISecretManager, SecretManager } from '../account/keys';
import { DataService } from '../data/data.service';
import { Address } from "../interfaces/types.interface";
import { storeStateManager } from '../state/state-manager';
import { IStateManager, ISyncOperationParams, PPv1PrivateOperation, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';
import { AspService } from "../data/asp.service";
import { RelayerClient } from "../relayer/relayer-client";

const DefaultContext: PrivacyPoolsV1ProtocolContext = {};

const chainIsEvmChain = (chainId: ChainId): chainId is Eip155ChainId =>
  chainId.namespace === 'eip155';

const getAssetAddress = (assetId: AssetId) => BigInt((assetId as Erc20Id).reference || 0n);

export class PrivacyPoolsV1Protocol extends Plugin {
  private accountIndex: number;
  private secretManager: ISecretManager;
  private stateManager: IStateManager;
  private context: PrivacyPoolsV1ProtocolContext;
  private chainsEntrypoints: Map<string, Address>;
  private relayersList: Map<string, string>;

  constructor(readonly host: Host,
    {
      context = DefaultContext,
      secretManager = SecretManager,
      stateManager = storeStateManager,
      chainsEntrypoints = {},
      relayersList = {},
      relayerClientFactory = () => new RelayerClient({ network: host.network }),
    }: Partial<PrivacyPoolsV1ProtocolParams> = {}) {
    super();
    this.context = context;
    this.accountIndex = 0;
    this.secretManager = secretManager({
      host,
      accountIndex: this.accountIndex
    });
    this.stateManager = stateManager({
      secretManager: this.secretManager,
      aspService: new AspService(host.network),
      dataService: new DataService({ provider: host.ethProvider }),
      relayerClient: relayerClientFactory(),
    });
    this.chainsEntrypoints = new Map<string, bigint>(Object.entries(chainsEntrypoints));
    this.relayersList = new Map<string, string>(Object.entries(relayersList));
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

  override broadcastPrivateOperation(operation: PrivateOperation): Promise<void> {
    throw new Error("Method not implemented.");
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

    const payloads = await this.stateManager.getWithdrawalPayloads({
      chainId,
      entrypoint,
      asset: getAssetAddress(asset),
      amount,
      recipient: entrypoint, // TODO: convert AccountId to Address properly
      relayerConfig: { url: '' }, // TODO: configure relayer
    });

    // TODO: generate ZK proofs and construct PrivateOperation
    return {
      relayData: {} as unknown,
      txData: "0x"
    } as any;
  }

  broadcast(operation: PPv1PrivateOperation): Promise<void> {
    throw new Error("Method not implemented.");
  }

}
