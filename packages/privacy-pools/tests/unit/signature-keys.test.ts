import { keccak256, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { describe, expect, it } from 'vitest';

import { SignatureSecretManager } from '../../src/account/signature-keys';
import { createMockHost } from '../utils/mock-host';

const ENTRYPOINT = 0x34a2068192b1297f2a7f85d7d8cde66f8f0921cbn;
const CHAIN_ID = 11155111n;

const makeManager = () => SignatureSecretManager({ host: createMockHost(), accountIndex: 0 });

describe('SignatureSecretManager', () => {
  it('pins the EIP-712 domain salt to keccak256("kohaku")', () => {
    expect(keccak256(stringToHex('kohaku'))).toBe(
      '0xfa71183e322d5355a0a9a3a501eaa297d3aec60fd991163f5271875f13e08247',
    );
  });

  it('derives a full Secret with a precommitment inside the BN254 field', async () => {
    const s = await makeManager().getDepositSecrets({ entrypointAddress: ENTRYPOINT, chainId: CHAIN_ID, depositIndex: 0 });

    const BN254 = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

    for (const v of [s.nullifier, s.salt, s.precommitment, s.nullifierHash]) {
      expect(v).toBeGreaterThan(0n);
      expect(v).toBeLessThan(BN254);
    }
    // nullifier and salt come from independent domain tags off one signature
    expect(s.nullifier).not.toBe(s.salt);
  });

  it('is deterministic for the same (chainId, entrypoint, depositIndex)', async () => {
    const params = { entrypointAddress: ENTRYPOINT, chainId: CHAIN_ID, depositIndex: 2 };
    const a = await makeManager().getDepositSecrets(params);
    const b = await makeManager().getDepositSecrets(params);

    expect(b).toEqual(a);
  });

  it('yields distinct notes per deposit index, chain, entrypoint, and withdraw index', async () => {
    const m = makeManager();
    const base = { entrypointAddress: ENTRYPOINT, chainId: CHAIN_ID, depositIndex: 0 };

    const original = await m.getDepositSecrets(base);
    const byDeposit = await m.getDepositSecrets({ ...base, depositIndex: 1 });
    const byChain = await m.getDepositSecrets({ ...base, chainId: 1n });
    const byEntrypoint = await m.getDepositSecrets({ ...base, entrypointAddress: ENTRYPOINT + 1n });
    const byWithdraw = await m.getSecrets({ ...base, withdrawIndex: 1 });

    const keys = [original, byDeposit, byChain, byEntrypoint, byWithdraw].map((s) => s.precommitment);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('getSecrets at withdrawIndex 0 equals getDepositSecrets (shared secretIndex 0)', async () => {
    const m = makeManager();
    const base = { entrypointAddress: ENTRYPOINT, chainId: CHAIN_ID, depositIndex: 5 };

    const deposit = await m.getDepositSecrets(base);
    const withdraw0 = await m.getSecrets({ ...base, withdrawIndex: 0 });

    expect(withdraw0).toEqual(deposit);
  });

  describe('deriveEphemeralSigner', () => {
    it('derives a valid, deterministic secp256k1 key disjoint per withdraw index', async () => {
      const m = makeManager();
      const base = { entrypointAddress: ENTRYPOINT, chainId: CHAIN_ID, depositIndex: 0, withdrawIndex: 0 };

      const key = await m.deriveEphemeralSigner(base);

      expect(key).toMatch(/^0x[0-9a-f]{64}$/);
      expect(() => privateKeyToAccount(key)).not.toThrow();
      expect(await m.deriveEphemeralSigner(base)).toBe(key);
      expect(await m.deriveEphemeralSigner({ ...base, withdrawIndex: 1 })).not.toBe(key);
    });
  });
});
