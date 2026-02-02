import { Abi, parseAbiItem } from "viem";

export const EVENTS_SIGNATURES = {
  PoolDeposited: parseAbiItem('event Deposited(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _merkleRoot)'),
  Withdrawn: parseAbiItem('event Withdrawn(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment)'),
  Ragequit: parseAbiItem('event Ragequit(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value)'),
  EntrypointDeposited: parseAbiItem('event Deposited(address indexed _depositor, address indexed _pool, uint256 _commitment, uint256 _amount)'),
  RootUpdated: parseAbiItem('event RootUpdated(uint256 _root, string _ipfsCID, uint256 _timestamp)')
} as const;

export type EventTypes = keyof typeof EVENTS_SIGNATURES;

export const poolAbi = [
  {
    "type": "function",
    "name": "ASSET",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SCOPE",
    "inputs": [],
    "outputs": [
      {
        "name": "_scope",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
] as const satisfies Abi;

export const entrypointAbi = [
  {
    "type": "function",
    "name": "assetConfig",
    "inputs": [
      {
        "name": "_asset",
        "type": "address",
        "internalType": "contract IERC20"
      }
    ],
    "outputs": [
      {
        "name": "pool",
        "type": "address",
        "internalType": "contract IPrivacyPool"
      },
      {
        "name": "minimumDepositAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "vettingFeeBPS",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "maxRelayFeeBPS",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  }
] as const satisfies Abi;