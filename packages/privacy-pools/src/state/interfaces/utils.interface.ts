export type Serializable<T> = T extends [infer Key, infer Value][]
  ? [Serializable<Key>, Serializable<Value>][]
  : T extends Array<infer U>
    ? Serializable<U>[]
    : T extends bigint
      ? string
      : T extends object
        ? {
            [key in keyof T]: Serializable<T[key]>;
          }
        : T;

export type Deserialize<T> = T extends [infer Key, infer Value][]
  ? [Deserialize<Key>, Deserialize<Value>][]
  : T extends Array<infer U>
    ? Deserialize<U>[]
    : T extends string
      ? bigint
      : T extends bigint & {}
        ? bigint
        : T extends object
          ? {
              [key in keyof T]: Deserialize<T[key]>;
            }
          : T;
