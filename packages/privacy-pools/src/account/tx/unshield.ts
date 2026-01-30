import { encodeFunctionData, getAddress } from 'viem';

import { Circuits } from '@fatsolutions/privacy-pools-core-circuits';
import { AssetId, AssetType, createTx, Erc20Asset } from '@kohaku-eth/provider';
import { Host } from '@kohaku-eth/plugins';

import { entrypointAbi } from '../../data/abis/entrypoint.abi';
import { Note } from '../../plugin/interfaces/protocol-params.interface';
import { generateProof } from '../../proofs';
import { Secret } from '../keys';

type PrepareUnShieldContext = {
  host: Host;
  notes: {
    existing: Note & Secret;
    new: Note & Secret;
  };
  unshield: { asset: AssetId; amount: bigint; };
};

type PrepareUnShieldContextWithEntrypoint = PrepareUnShieldContext & {
  entrypointAddress: string;
};

function isErc20(at: AssetType): at is Erc20Asset {
  return at.kind === "Erc20";
}

export async function prepareUnshield({ notes, unshield, entrypointAddress }: PrepareUnShieldContextWithEntrypoint) {

  // XXX: we assume we have enough balance for now
  const { asset: { assetType: token, chainId }, amount } = unshield;

  if (!isErc20(token)) {
    throw new Error(`Asset type \`${token.kind}\` not supported.`);
  }

  const scope = await getScopeFromToken(entrypointAddress, token.address);

  const circuits = new Circuits();
  await circuits.initArtifacts("latest");

  // 3. Generate mock proof
  const proof = generateProof({ existingNote: notes.existing, newNote: notes.new });

  // 4. Encode transaction
  const data = encodeFunctionData({
    abi: entrypointAbi,
    functionName: "relay",
    args: [
      {
        // TODO: set entrypoint address
        processooor: getAddress(entrypointAddress),
        // TODO: set relay data
        data: "0x0",
      },
      proof,
      scope
    ]
  });

  const tx = createTx(entrypointAddress, data);

  // Return nullifiers and tx
  // User should: 1) submit tx, 2) wait for confirmation, 3) call markSpent() for each nullifier
  return { tx };
}

async function getScopeFromToken(entrypointAddress: string, token: string): Promise<bigint> {
  throw new Error('Function not implemented.');
}
