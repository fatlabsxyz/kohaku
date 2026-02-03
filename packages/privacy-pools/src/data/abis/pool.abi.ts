import { Abi } from "viem";

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
