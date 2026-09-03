/**
 * ~60-line typed service locator. No decorators, no reflect-metadata: those
 * need experimental decorators plus a runtime shim, and buy nothing over a
 * branded token when every service is registered in one composition root.
 */
declare const TOKEN_BRAND: unique symbol;

export interface Token<T> {
  readonly key: string;
  readonly [TOKEN_BRAND]?: T;
}

export const token = <T>(key: string): Token<T> => ({ key });

export type Factory<T> = (container: Container) => T;

export interface Container {
  /** Lazy singleton: factory runs at most once, on first resolve. */
  register<T>(token: Token<T>, factory: Factory<T>): void;
  /** Already-constructed value (config objects, Electron handles). */
  registerValue<T>(token: Token<T>, value: T): void;
  resolve<T>(token: Token<T>): T;
  has<T>(token: Token<T>): boolean;
  /** Child scope: reads parent registrations, overrides stay local (tests). */
  createScope(): Container;
}

export function createContainer(parent?: Container): Container {
  const factories = new Map<string, Factory<unknown>>();
  const instances = new Map<string, unknown>();

  const container: Container = {
    register(t, factory) {
      factories.set(t.key, factory);
      instances.delete(t.key);
    },
    registerValue(t, value) {
      instances.set(t.key, value);
    },
    resolve(t) {
      if (instances.has(t.key)) return instances.get(t.key) as never;
      const factory = factories.get(t.key);
      if (factory) {
        const instance = factory(container);
        instances.set(t.key, instance);
        return instance as never;
      }
      if (parent) return parent.resolve(t);
      throw new Error(`No provider registered for token "${t.key}"`);
    },
    has(t) {
      return instances.has(t.key) || factories.has(t.key) || (parent?.has(t) ?? false);
    },
    createScope() {
      return createContainer(container);
    },
  };
  return container;
}
