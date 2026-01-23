import { randomBytes } from '@noble/hashes/utils';
import snarkjs from 'snarkjs';
import circomlib from 'circomlib';
import { Address, encodeFunctionData, formatUnits, Hex } from 'viem';
import { AssetID } from 'node_modules/@kohaku-eth/plugins/src/types';
import { TxData } from '@kohaku-eth/provider';
import { getChainConfig, getEthConfig, getTokenConfig } from './config';
import { TornadoProxyAbi } from './abi/tornadoProxy';
import { Erc20Abi } from './abi/erc20';

const rbigint = (nbytes: number) => snarkjs.bigInt.leBuff2int(Buffer.from(randomBytes(nbytes)));
const pedersenHash = (data: Buffer) => circomlib.babyJub.unpackPoint(circomlib.pedersenHash.hash(data))[0];

function toHex(number: any, length = 32): Hex {
    const str = number instanceof Buffer ? number.toString('hex') : snarkjs.bigInt(number).toString(16);
    return `0x${str.padStart(length * 2, '0')}`;
}

/**
 * Create deposit object from secret and nullifier
 */
function createDeposit({ nullifier, secret }: { nullifier: snarkjs.BigInt; secret: snarkjs.BigInt }) {
    const preimage = Buffer.concat([nullifier.leInt2Buff(31), secret.leInt2Buff(31)]);
    const commitment = pedersenHash(preimage);
    const commitmentHex = toHex(commitment);
    const nullifierHash = pedersenHash(nullifier.leInt2Buff(31));
    const nullifierHex = toHex(nullifierHash);

    const deposit = {
        nullifier,
        secret,
        preimage,
        commitment,
        commitmentHex,
        nullifierHash,
        nullifierHex,
    };
    return deposit;
}

/**
 * Create a new deposit, returning the deposit object
 * 
 * @param currency The asset ID of the currency to deposit
 * @param amount The amount to deposit in wei
 * @param commitmentNote The commitment note as a string
 */
async function deposit({ currency, value, commitmentNote }: { currency: AssetID; value: bigint; commitmentNote: string }): Promise<TxData[]> {
    const commitment = toHex(commitmentNote);

    if (currency.chainId.kind !== 'Evm') {
        throw new Error('Unsupported chain for deposit');
    }

    if (currency.assetType.kind === 'Slip44') {
        const txData = depositNative(currency.chainId.chainId, value, commitment);
        return txData;
    } else if (currency.assetType.kind === 'Erc20') {
        const txData = depositErc20(currency.chainId.chainId, currency.assetType.address, value, commitment);
        return txData;
    } else {
        throw new Error('Unsupported asset type for deposit');
    }
}

function depositNative(chainId: number, value: bigint, commitment: Hex): TxData[] {
    const config = getChainConfig(chainId);
    const currencyConfig = getEthConfig(chainId);

    const to = config.proxy as Address;
    const amount = formatUnits(value, 18);
    const tornadoInstance = currencyConfig.instanceAddress[amount];
    if (!tornadoInstance) {
        const available = Object.keys(currencyConfig.instanceAddress).join(', ');
        throw new Error(`Unsupported deposit amount: ${amount}, available: ${available}`);
    }

    const data = encodeFunctionData({
        abi: TornadoProxyAbi,
        functionName: 'deposit',
        args: [tornadoInstance, commitment, '0x']
    });

    return [{
        to,
        data,
        value,
    }];
}

function depositErc20(chainId: number, tokenAddress: Address, value: bigint, commitment: Hex): TxData[] {
    const config = getChainConfig(chainId);
    const currencyConfig = getTokenConfig(chainId, tokenAddress);

    // TODO: Consider granting higher approval & checking allowance. 
    // Approval
    const allowanceData = encodeFunctionData({
        abi: Erc20Abi,
        functionName: 'approve',
        args: [config.proxy as Address, value],
    });

    const allowanceTx: TxData = {
        to: tokenAddress,
        data: allowanceData,
        value: 0n,
    };

    // Deposit
    const to = config.proxy as Address;
    const amount = formatUnits(value, currencyConfig.decimals);
    const tornadoInstance = currencyConfig.instanceAddress[amount];
    if (!tornadoInstance) {
        const available = Object.keys(currencyConfig.instanceAddress).join(', ');
        throw new Error(`Unsupported deposit amount: ${amount}, available: ${available}`);
    }

    const data = encodeFunctionData({
        abi: TornadoProxyAbi,
        functionName: 'deposit',
        args: [tornadoInstance, commitment, '0x']
    });

    const depositTx: TxData = {
        to,
        data,
        value: 0n,
    };

    return [allowanceTx, depositTx];
}