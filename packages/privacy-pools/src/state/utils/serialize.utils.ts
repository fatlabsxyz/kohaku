import { Deserialize, Serializable } from "../interfaces/utils.interface";

export const serialize = <const T>(data: T): Serializable<T> => {
  switch (typeof data) {
    case "object": {
      if (data === null) {
        return data as Serializable<T>;
      }

      if (data instanceof Array) {
        return data.map(serialize) as Serializable<T>;
      }

      return Object.entries(data).reduce((serializedObject, [key, value]) => {
        serializedObject[key as keyof typeof serializedObject] =
          serialize(value);

        return serializedObject;
      }, {} as Serializable<T>);
    }
    case "bigint":
      return '0x' + data.toString(16) as Serializable<T>;
    default:
      return data as Serializable<T>;
  }
};

export const deserialize = <T>(data: T): Deserialize<T> => {
  switch (typeof data) {
    case "object": {
      if (data === null) {
        return data as Deserialize<T>;
      }

      if (data instanceof Array) {
        return data.map(deserialize) as Deserialize<typeof data>;
      }

      return Object.entries(data).reduce(
        (deserializedObject, [key, value]) => {
          deserializedObject[key as keyof typeof deserializedObject] =
            deserialize(value);

          return deserializedObject;
        },
        {} as Deserialize<typeof data>,
      );
    }
    case "string":
      return BigInt(data) as Deserialize<T>;
    default:
      return data as Deserialize<T>;
  }
};
