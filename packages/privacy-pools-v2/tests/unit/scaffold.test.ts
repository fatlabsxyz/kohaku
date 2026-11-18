import { describe, expect, it } from 'vitest';
import type { Host } from '@kohaku-eth/plugins';
import { createPPv2Plugin } from '../../src';

describe('createPPv2Plugin', () => {
  it('returns an instance exposing the plugin interface', async () => {
    const instance = await createPPv2Plugin({} as Host, { foo: 'bar' });

    expect(Object.keys(instance).sort()).toEqual([
      'balance',
      'instanceId',
      'prepareShield',
      'prepareShieldMulti',
      'prepareTransfer',
      'prepareTransferMulti',
      'prepareUnshield',
      'prepareUnshieldMulti',
    ]);
  });
});
