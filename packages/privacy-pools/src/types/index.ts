import { AccountId, Address, AssetId, U256 } from "./base";
import { HostInterface } from "./host";

export type Transaction = unknown;

export interface PrepareShieldResult {
  transactions: Array<Transaction>;
  // TODO: Additional metadata as needed
}

// Represents a prepared operation that can be submitted to the privacy protocol.
export interface PoolOperation {
  // Inner is data used by the pool to submit the operation. This is explicitly unknown the SDK consumer, is unstable, and will vary from pool to pool.
  inner: undefined;
  // TODO: Additional metadata as needed
}

export interface PrivacyProtocolConstructor {
  new(host: HostInterface): PrivacyProtocol;
}

export interface PrivacyProtocol {

  // Prepares a shield operation.
  //
  // Returns the list of transactions that will be broadcasted to perform the shield.
  //
  // Returns an error if the shield cannot be performed.
  prepareShield(assets: Array<{ asset: AssetId, amount: U256; }>): PrepareShieldResult | Promise<PrepareShieldResult>;

  // Prepares an unshield operation.
  // 
  // TODO: Add structured metadata if needed for client-side validation.
  //
  // Returns an error if the unshield cannot be performed.
  prepareUnshield(
    target: Address,
    assets: Array<{ asset: AssetId, amount: U256; }>,
  ): PoolOperation;

  // Prepares a transfer operation.
  // 
  // TODO: Add structured metadata if needed for client-side validation.
  //
  // Returns an error if the transfer cannot be performed.
  prepareTransfer(
    target: AccountId,
    assets: Array<{ asset: AssetId, amount: U256; }>,
  ): PoolOperation;

  // Broadcasts a PoolOperation constructed by this plugin.
  // 
  // Returns an error if the operation was not constructed by this plugin or cannot otherwise be broadcasted.
  broadcast(operation: PoolOperation): void;

  // Returns the current balance of the specified asset held by this pool
  // 
  // If assets is empty, returns the balances for all assets.
  balance(assets: Array<{ asset: AssetId; }>): Array<{ asset: AssetId; balance: U256; }>;

}
