export type Many<T> = T | T[];

export function manyToArray<T>(x: Many<T>): T[] {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}
