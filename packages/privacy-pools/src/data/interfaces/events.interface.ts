import { Address, Commitment, Label, Nullifier, Precommitment } from "../../interfaces/types.interface";

interface IBaseEvent {
  blockNumber: bigint;
  transactionHash: bigint;
  value: bigint;
}

export interface IPoolDepositEvent extends IBaseEvent {
  depositor: Address;
  commitment: Commitment;
  label: Label;
  precommitment: Precommitment;
}

export interface IIndexedDepositEvent extends IPoolDepositEvent {
  index: number;
}

export interface IDepositWithAsset extends IIndexedDepositEvent {
  assetAddress: Address;
}

export interface IWithdrawalEvent extends IBaseEvent {
  spentNullifier: Nullifier;
  newCommitment: Commitment;
}

export interface IIndexedWithdrawalEvent extends IWithdrawalEvent {
  index: number;
  label: Label;
}

export interface IRagequitEvent extends IBaseEvent {
  ragequitter: Address;
  commitment: Commitment;
  label: Label;
}

export interface IEntrypointDepositEvent extends IBaseEvent {
  depositor: Address;
  poolAddress: Address;
  commitment: Commitment;
}

export interface IRootUpdatedEvent extends Omit<IBaseEvent, 'value'> {
  root: bigint;
  ipfsCID: string;
  timestamp: bigint;
}

export interface IPool {
  address: Address;
  assetAddress: Address;
  scope: bigint;
}

export interface IAsset {
  name: string;
  decimals: number;
  address: Address;
  symbol: string;
}
