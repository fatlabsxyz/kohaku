import { createAsyncThunk, unwrapResult } from "@reduxjs/toolkit";

import { ISecretManager } from "../../account/keys";
import { IDataService } from "../../data/interfaces/data.service.interface";
import { IIndexedDepositWithSecrets } from "../../data/interfaces/events.interface";
import { Address } from "../../interfaces/types.interface";
import { computeMinimumViableFee, reasonableGasUnits } from "../../paymaster/fee";
import { setupBundlerClient, signDelegationAuthorization } from "../../paymaster/utils";
import { IPaymasterConfig, IWithdrawalPayload, SignedDelegation } from "../../plugin/interfaces/protocol-params.interface";
import { poolFromAssetSelector } from "../selectors/pools.selector";
import { RootState } from "../store";
import { verifyRootsThunk } from "./verifyRootsThunk";
import { WithdrawalProofsThunkParams, withdrawalsProofThunk } from "./withdrawalsProofThunk";

export interface PaymasterWithdrawThunkParams extends Omit<WithdrawalProofsThunkParams, 'deposit' | 'fee' | 'relayerAddress'> {
  getWithdrawableDeposits: (asset: Address, amount?: bigint) => IIndexedDepositWithSecrets[];
  dataService: IDataService;
  assetAddress: bigint;
  amount?: bigint;
  paymasterConfig: IPaymasterConfig;
  secretManager: ISecretManager;
}

export const paymasterWithdrawThunk = createAsyncThunk<
  IWithdrawalPayload[],
  PaymasterWithdrawThunkParams,
  { state: RootState; }
>('withdraw/executePaymasterWithdrawals', async ({
  getWithdrawableDeposits,
  dataService,
  assetAddress,
  amount,
  paymasterConfig,
  secretManager,
  ...rest
}, { getState, dispatch }) => {
  const state = getState();
  const deposits = getWithdrawableDeposits(assetAddress, amount);
  const poolInfo = poolFromAssetSelector(state, assetAddress);

  if (!poolInfo) throw new Error(`No pool found for asset ${assetAddress}`);

  unwrapResult(
    await dispatch(verifyRootsThunk({
      dataService,
      onlyThesePools: [poolInfo.address]
    }))
  );

  const bundlerClient = setupBundlerClient({
    bundlerUrl: paymasterConfig.bundlerUrl,
    entryPointAddress: paymasterConfig.entryPointAddress,
    chainId: Number(state.instanceRegistryInfo.chainId)
  });

  const { standard: { maxFeePerGas } } = await bundlerClient.getUserOperationGasPrice();

  const fee = computeMinimumViableFee(reasonableGasUnits, maxFeePerGas);

  // The relayer address in the proof is the paymaster — it receives the fee
  const relayerAddress = BigInt(paymasterConfig.paymasterAddress) as Address;

  const withdrawResultAction = await dispatch(
    withdrawalsProofThunk({
      ...rest,
      deposits,
      relayerAddress,
      fee,
    }),
  );

  const proofOutputs = unwrapResult(withdrawResultAction);

  // Compute delegation only for deterministic mode — random is deferred to broadcast.
  // Each deposit gets its own signer derived from its deposit index.
  let delegations: (SignedDelegation | undefined)[];

  if (paymasterConfig.delegation?.mode === 'deterministic') {
    const chainId = Number(await dataService.getChainId());

    delegations = await Promise.all(
      deposits.map(async (deposit) => {
        const ephemeralPk = await secretManager.deriveEphemeralSigner(deposit.index);

        return signDelegationAuthorization({
          privateKey: ephemeralPk,
          accountAddress: paymasterConfig.accountAddress,
          chainId,
          nonce: 0,
        });
      }),
    );
  } else {
    delegations = deposits.map(() => undefined);
  }

  return proofOutputs.map((proof, i) => ({
    mode: 'paymaster' as const,
    proof,
    poolAddress: poolInfo.address,
    paymasterAddress: paymasterConfig.paymasterAddress,
    entryPointAddress: paymasterConfig.entryPointAddress,
    bundlerUrl: paymasterConfig.bundlerUrl,
    accountAddress: paymasterConfig.accountAddress,
    delegation: delegations[i],
  })) satisfies IWithdrawalPayload[];
});
