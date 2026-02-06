import { createSelector, Tuple } from "@reduxjs/toolkit";
import { RootState } from "../store";
import { Deserialize } from "../interfaces/utils.interface";
import { deserialize } from "./serialize.utils";

export const selectEntityMap = <
  const SelectorType extends (state: RootState) => [any, any][],
  const TransformFn extends (
    tuple: ReturnType<SelectorType>[number],
  ) => [Deserialize<(typeof tuple)[0]>, Deserialize<(typeof tuple)[1]>],
>(
  mapFn: SelectorType,
  transform: TransformFn = deserialize as TransformFn,
): ((
  state: RootState,
) => Map<ReturnType<TransformFn>[0], ReturnType<TransformFn>[1]>) =>
  createSelector([mapFn], (tuple) => new Map(tuple.map(transform))) as never;
