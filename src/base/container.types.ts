import type { NOT_FOUND_SYMBOL } from './internals';
import type { Token } from './token.types';
import type { TodoAny } from './util.types';
import type { FactoryOptions } from '../module/provider.types';

/**
 * Dependency container.
 */
export type Container = {
  /**
   * Binds a value for the token
   */
  bindValue<T>(token: Token<T>, value: T): void;
  /**
   * Binds a factory for the token.
   */
  bindFactory<T>(token: Token<T>, factory: (container: Container) => T, options?: FactoryOptions): void;
  /**
   * Checks if the token is registered in the container hierarchy.
   */
  hasToken(token: Token<unknown>): boolean;
  /**
   * Returns a resolved value by the token, or returns `undefined` in case the token is not found.
   */
  get<T>(token: Token<T>): T | undefined;
  /**
   * Returns a resolved value by the token, or throws `ResolverError` in case the token is not found.
   */
  resolve<T>(token: Token<T>): T;
};

/** @internal */
export type FactoryContext<T> = {
  factory: (container: Container) => T;
  options?: FactoryOptions;
};
/** @internal */
export type ValuesMap = Map<symbol, TodoAny>;
/** @internal */
export type FactoriesMap = Map<symbol, FactoryContext<TodoAny>>;
/** @internal */
export type Resolver = <T>(token: Token<T>, origin: Container) => T | typeof NOT_FOUND_SYMBOL;
