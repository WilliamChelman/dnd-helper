export interface Command<T> {
  run(options: T): Promise<void>;
}
