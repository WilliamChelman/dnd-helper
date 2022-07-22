export interface Commands<T> {
  run(options: T): Promise<void>;
}
