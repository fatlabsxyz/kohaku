import { AccountId, Address, AssetId, U256 } from "./primitives.interface";

export interface PrivacyProtocol {
  // Shields the specified assets into this pool
  // 
  // Returns an error if the account cannot accept the specified asset or amount
  shield(assets: Array<{ asset: AssetId, amount: U256 }>): void;

  //? Consider merging unshield and transfer into a single `withdraw` method.
  //? As-is the sdk consumer needs to know for what asset pairs they should call unshield
  //? or transfer, which could be simple (IE asset pairs with the same namespace are transfer,
  //? asset pairs with different namespaces are unshield) but is still an added complexity.

  // Unshields the specified amount to a regular address
  //
  // Returns an error if the assets cannot be unshielded to the target account
  unshield(
    target: Address,
    assets: Array<{ asset: AssetId, amount: U256 }>,
  ): void;
  
  // Transfers the specified amount to a shielded account.
  //
  // Returns an error if the assets cannot be transfered to the target account
  transfer(
    target: AccountId,
    assets: Array<{ asset: AssetId, amount: U256 }>,
  ): void;

  // Returns the current balance of the specified asset held by this pool
  // 
  // If assets is empty, returns the balances for all assets.
  balance(assets: Array<{ asset: AssetId }>): Array<{ asset: AssetId; balance: U256 }>

}
