interface IBaseEvent {
    blockNumber: bigint;
    transactionHash: bigint;
    value: bigint
}

export interface IPoolDepositEvent extends IBaseEvent {
  depositor: bigint;
  commitment: bigint;
  label: bigint;
  precommitment: bigint;
}

export interface IWithdrawalEvent extends IBaseEvent {
  spentNullifier: bigint;
  newCommitment: bigint;
}

export interface IRagequitEvent extends IBaseEvent {
  ragequitter: bigint;
  commitment: bigint;
  label: bigint;
}

export interface IEntrypointDepositEvent extends IBaseEvent {
    depositor: bigint;
    poolAddress: bigint;
    commitment: bigint;
}
