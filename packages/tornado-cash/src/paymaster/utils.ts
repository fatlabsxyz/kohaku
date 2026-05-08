import { BundlerClient } from 'privacy-paymaster';

export function setupBundlerClient({
  bundlerUrl,
  entryPointAddress
}: {
  chainId: number,
  bundlerUrl: string,
  entryPointAddress: `0x${string}`;
}) {
  return new BundlerClient(bundlerUrl, entryPointAddress);
}
