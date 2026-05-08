import { BundlerClient, TornadoBuilder } from 'privacy-paymaster';
import { type Hash } from 'viem';

import { IPaymasterWithdrawalPayload } from '../plugin/interfaces/protocol-params.interface';
import { EthereumProvider } from '@kohaku-eth/provider';
import { reasonableGasUnits } from './fee';

export interface PaymasterBroadcastResult {
  userOpHash: Hash;
}

export class PaymasterBroadcaster {
  constructor(
    private provider: EthereumProvider,
  ) { }

  async broadcast(
    withdrawals: IPaymasterWithdrawalPayload[],
  ): Promise<PaymasterBroadcastResult[]> {
    const results = await Promise.allSettled(
      withdrawals.map((w) => this.broadcastOne(w)),
    );

    const failed = results.filter((r) => r.status === 'rejected');

    if (failed.length > 0) {
      console.warn(
        `Some paymaster withdrawals failed.`,
        failed.map((e) => e.reason).join('\n'),
      );
    }

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);
  }

  private async broadcastOne(
    withdrawal: IPaymasterWithdrawalPayload,
  ): Promise<PaymasterBroadcastResult> {
    const {
      proof: { proof: proofHex, args: proofArgs },
      paymasterAddress,
      entryPointAddress,
      bundlerUrl,
      senderAddress,
      authorization
    } = withdrawal;
    const [root, nullifierHash, recipient, _paymasterAddress, feeHex, _refund] = proofArgs;

    console.log("WITH AUTHORIZATION", authorization);

    if (BigInt(paymasterAddress) !== BigInt(_paymasterAddress)) {
      throw new Error(`relayer must be paymaster when using the 4337 paymaster flow: ${paymasterAddress} != ${_paymasterAddress}`);
    }

    // const { publicClient, bundlerClient } = await setupClients({
    //   bundlerUrl,
    //   entryPointAddress,
    //   provider: this.provider
    // });
    const bundlerClient = new BundlerClient(bundlerUrl, entryPointAddress);
    const { standard: { maxFeePerGas, maxPriorityFeePerGas } } = await bundlerClient.getUserOperationGasPrice();

    const op = await new TornadoBuilder(senderAddress)
      .withPaymaster(paymasterAddress)
      .withAuthorization(authorization as any) // viem version mismatch
      .withWithdraw(
        proofHex,
        root,
        nullifierHash,
        recipient as `0x${string}`,
        _paymasterAddress as `0x${string}`,
        BigInt(feeHex),
      )
      // .withGas({ type: 'auto' })
      .withGas({
        type: 'manual',
        ...reasonableGasUnits,
        maxFeePerGas,
        maxPriorityFeePerGas,
      })
      .build(this.provider, bundlerClient); // viem version mismatch

    const userOpHash = await bundlerClient.sendUserOperation(op);

    await bundlerClient.waitForUserOperationReceipt(userOpHash);

    return { userOpHash };
  }
}
