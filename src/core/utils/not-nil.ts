export function notNil<T>(o: T): o is Exclude<T, null | undefined> {
  return o != null;
}
