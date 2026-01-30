import { AccountId, AssetAmount, AssetId, ChainId, Eip155ChainId, Erc20Id, Host, Plugin, PrivateOperation, ShieldPreparation } from "@kohaku-eth/plugins";
import { ISecretManager, SecretManager } from '../account/keys';
import { prepareShield } from '../account/tx/shield';
import { IStateManager, ISyncOperationParams, PrivacyPoolsV1ProtocolContext, PrivacyPoolsV1ProtocolParams } from './interfaces/protocol-params.interface';
import { storeStateManager } from '../state/state-manager';
import { DataService } from '../data/data.service';
import { Address } from "../interfaces/types.interface";

const DefaultContext: PrivacyPoolsV1ProtocolContext = {};

const chainIsEvmChain = (chainId: ChainId): chainId is Eip155ChainId => 
  chainId.namespace !== 'eip155';

const getAssetAddress = (assetId: AssetId) => BigInt((assetId as Erc20Id).reference || 0n)

export class PrivacyPoolsV1Protocol extends Plugin {
  private accountIndex: number;
  private secretManager: ISecretManager;
  private stateManager: IStateManager;
  private context: PrivacyPoolsV1ProtocolContext;
  private chainsEntrypoints: Map<string, Address>;

  constructor(readonly host: Host,
    {
      context = DefaultContext,
      secretManager = SecretManager,
      stateManager = storeStateManager,
      chainsEntrypoints = {},
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
        dataService: new DataService({ provider: host.ethProvider })
      });
      this.chainsEntrypoints = new Map<string, bigint>(Object.entries(chainsEntrypoints))
  }

  account(): Promise<AccountId> {
    throw new Error("Method not implemented.");
  }

  /**
   * Only process supported assets or error out?
   * Returns the balances of the requested assets.
   * The assets retain the provided order. If an asset is not supported its balance will be 0
   */
  async balance(assets: AssetId[] = []): Promise<AssetAmount[]> {
    const evmAssets = assets.filter(({ chainId }) => chainIsEvmChain(chainId)) as (AssetId & { chainId: Eip155ChainId<number> })[];

    // Map keys are unique so only distinct chains will remain
    const chainsRequested = new Map(evmAssets.map(({chainId}) => [chainId.toString(), chainId]));
    const assetsByChain = evmAssets.reduce((assetsByChain, asset) => {
      const assetChain = asset.chainId.toString();
      assetsByChain[assetChain] = [...(assetsByChain[assetChain] || []), asset];
      return assetsByChain;
    }, {} as Record<string, AssetId[]>);

    const balances = await Promise.all(Array.from(chainsRequested).map(async ([chainIdString, chainId]) =>  {
      const params: ISyncOperationParams = {
        chainId,
        entrypoint: this.chainsEntrypoints.get(chainIdString)!
      }
      await this.stateManager.sync(params);

      const balancesMap = this.stateManager.getBalances({
        ...params,
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
      }
    })
  }

  broadcast(operation: Operation): Promise<void> {
    throw new Error("Method not implemented.");
  }

  override broadcastPrivateOperation(operation: PrivateOperation): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async prepareShield(assets: { asset: AssetId, amount: bigint; }, from?: Address): Promise<ShieldPreparation> {

    const txns: ShieldPreparation['txns'] = [];

    const { asset, amount } = assets;
    const { chainId } = asset;

    if (!chainIsEvmChain(chainId)) {
      throw new Error("Only support evm assets");
    }

    const entrypointAddress = this.context.entrypointAddress(chainId);
    await this.stateManager.sync(chainId, entrypointAddress);

    const depositCount = await this.stateManager.getDepositCount(chainId);
    const secret = this.secretManager.getDepositSecrets({
      entrypointAddress, depositIndex: depositCount, chainId: BigInt(chainId.reference)
    });
    const { tx } = await prepareShield({
      host: this.host, secret, shield: { asset, amount }, entrypointAddress
    });

    txns.push(tx);

    return { txns };
  }

  async prepareUnshield(assets: AssetAmount, to: Address): Promise<Operation> {
    
    const { asset, amount } = assets;
    const { chainId } = asset;
    
    if (!chainIsEvmChain(chainId)) {
      throw new Error("Only support evm assets");
    }

    const actualChainId = BigInt(chainId.reference);
    
    const entrypointAddress = this.context.entrypointAddress(chainId);
    await this.stateManager.sync(chainId, entrypointAddress);
    // Get a single note for {asset} with at least {amount}
    const note = this.stateManager.getNote(asset, amount);
    
    if (!note) {
      throw new Error("Not enough balance left in a single note for withdrawing.");
    }
    
    const { precommitment, deposit, withdraw, value } = note;
    
    const existingNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw,
      chainId: actualChainId,
    });
    const newNoteSecrets = this.secretManager.getSecrets({
      entrypointAddress,
      depositIndex: deposit,
      withdrawIndex: withdraw + 1,
      chainId: actualChainId,
    });

    return {
      inner: {
        existingNoteSecrets,
        newNoteSecrets
      }
    };
  }
}
