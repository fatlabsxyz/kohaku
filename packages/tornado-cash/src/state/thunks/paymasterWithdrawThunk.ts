import { createAsyncThunk, unwrapResult } from "@reduxjs/toolkit";
import { privateKeyToAccount } from 'viem/accounts';

import { ISecretManager } from "../../account/keys";
import { IDataService } from "../../data/interfaces/data.service.interface";
import { IIndexedDepositWithSecrets } from "../../data/interfaces/events.interface";
import { Address } from "../../interfaces/types.interface";
import { computeMinimumViableFee, reasonableGasUnits } from "../../paymaster/fee";
import { setupBundlerClient } from "../../paymaster/utils";
import { IPaymasterConfig, IWithdrawalPayload } from "../../plugin/interfaces/protocol-params.interface";
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

  // Derive ephemeral signer for EIP-7702 authorization
  // XXX: this should be unique per withdrawal in this state it DOXes you. We should move the EOA derivation to the paymaster maybe?
  const ephemeralPk = await secretManager.deriveEphemeralSigner(0);
  const ephemeralAccount = privateKeyToAccount(ephemeralPk);

  // Sign EIP-7702 authorization delegating the ephemeral EOA to the tornado account implementation
  const authorization = await ephemeralAccount.signAuthorization({
    contractAddress: paymasterConfig.accountAddress,
    chainId: Number(await dataService.getChainId()),
    nonce: await dataService.getAccountNonce(BigInt(ephemeralAccount.address)),
  });

  return proofOutputs.map((proof) => ({
    mode: 'paymaster' as const,
    proof,
    poolAddress: poolInfo.address,
    paymasterAddress: paymasterConfig.paymasterAddress,
    entryPointAddress: paymasterConfig.entryPointAddress,
    bundlerUrl: paymasterConfig.bundlerUrl,
    senderAddress: ephemeralAccount.address,
    authorization,
  })) satisfies IWithdrawalPayload[];
});
