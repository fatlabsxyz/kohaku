import { parseAbiItem } from "viem";

export const EVENTS_SIGNATURES = {
  Deposited: parseAbiItem('event Deposited(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _merkleRoot)'),
  Withdrawn: parseAbiItem('event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment)'),
  Ragequit: parseAbiItem('event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value)'),
} as const;

export type EventTypes = keyof typeof EVENTS_SIGNATURES;
