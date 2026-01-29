import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "../store";

export const selectEntityMap = <
    const SelectorType extends (state: RootState) => [any, any][]
>(mapFn: SelectorType) =>
    createSelector(
    [
        mapFn,
    ], 
    (tuple) => new Map(tuple)) as unknown as (state: RootState) => SelectorType extends (...params: any) => [infer Key, infer Value][] ? Map<Key, Value> : never;
