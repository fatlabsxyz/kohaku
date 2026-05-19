import { TornadoCashConfigs } from "../src";
import { getEnv } from "./utils/common";

export const getChainConfigSetup = (chainId: 1 | 11155111) => {
  if (chainId === 1) {
    return {
      protocolConfig: TornadoCashConfigs[1],
      rpcUrl: getEnv('RPC_URL_MAINNET'),
      forkBlockNumber: getEnv('TORNADO_MAINNET_FORK_BLOCK', '14273357'),
      erc20Address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',  // USDC
      erc20WhaleAddress: '0x55FE002aefF02f77364de339a1292923A15844B8',
      paymasterConfig: {
        entryPointAddress: '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108' as `0x${string}`,
        deployEnv: 'sepolia',
      },
    }
  }

  return {
    protocolConfig: TornadoCashConfigs[11155111],
    rpcUrl: getEnv('RPC_URL_SEPOLIA'),
    forkBlockNumber: getEnv('TORNADO_SEPOLIA_FORK_BLOCK', '8742157'),
    erc20Address: '0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0',  // USDT
    erc20WhaleAddress: '0xc94b1BEe63A3e101FE5F71C80F912b4F4b055925',
    paymasterConfig: {
      entryPointAddress: '0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108' as `0x${string}`,
      deployEnv: 'sepolia',
    },
  }
};
