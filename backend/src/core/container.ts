/**
 * A lightweight dependency injection container for managing application services.
 * This container supports singleton and transient lifetimes for registered services.
 */

type Constructor<T = any> = new (...args: any[]) => T;
type Factory<T = any> = (...args: any[]) => T;

export enum Lifetime {
  SINGLETON = 'singleton',
  TRANSIENT = 'transient',
}

interface Registration<T = any> {
  token: string | symbol | Constructor<T>;
  factory: Factory<T>;
  lifetime: Lifetime;
  instance?: T;
  dependencies?: Array<string | symbol | Constructor>;
}

export class Container {
  private static instance: Container;
  private registrations = new Map<string | symbol | Constructor, Registration>();

  private constructor() {}

  /**
   * Get the singleton instance of the container
   */
  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Register a service with the container
   * @param token The token to register the service under
   * @param factory The factory function to create the service
   * @param options Registration options
   */
  public register<T>(
    token: string | symbol | Constructor<T>,
    factory: Factory<T>,
    options: {
      lifetime?: Lifetime;
      dependencies?: Array<string | symbol | Constructor>;
    } = {}
  ): void {
    const { lifetime = Lifetime.SINGLETON, dependencies = [] } = options;

    this.registrations.set(token, {
      token,
      factory,
      lifetime,
      dependencies,
    });
  }

  /**
   * Register a singleton service with the container
   * @param token The token to register the service under
   * @param factory The factory function to create the service
   * @param dependencies Optional array of dependencies
   */
  public singleton<T>(
    token: string | symbol | Constructor<T>,
    factory: Factory<T>,
    dependencies: Array<string | symbol | Constructor> = []
  ): void {
    this.register(token, factory, {
      lifetime: Lifetime.SINGLETON,
      dependencies,
    });
  }

  /**
   * Register a transient service with the container
   * @param token The token to register the service under
   * @param factory The factory function to create the service
   * @param dependencies Optional array of dependencies
   */
  public transient<T>(
    token: string | symbol | Constructor<T>,
    factory: Factory<T>,
    dependencies: Array<string | symbol | Constructor> = []
  ): void {
    this.register(token, factory, {
      lifetime: Lifetime.TRANSIENT,
      dependencies,
    });
  }

  /**
   * Register a class with the container
   * @param token The token to register the class under (usually the class itself)
   * @param dependencies Optional array of dependencies to inject into the constructor
   */
  public registerClass<T>(
    token: Constructor<T>,
    dependencies: Array<string | symbol | Constructor> = []
  ): void {
    this.register(
      token,
      (...args) => new token(...args),
      {
        lifetime: Lifetime.SINGLETON,
        dependencies,
      }
    );
  }

  /**
   * Register an existing instance with the container
   * @param token The token to register the instance under
   * @param instance The instance to register
   */
  public registerInstance<T>(token: string | symbol | Constructor<T>, instance: T): void {
    this.registrations.set(token, {
      token,
      factory: () => instance,
      lifetime: Lifetime.SINGLETON,
      instance,
    });
  }

  /**
   * Resolve a service from the container
   * @param token The token to resolve
   * @returns The resolved service
   */
  public resolve<T>(token: string | symbol | Constructor<T>): T {
    const registration = this.registrations.get(token);
    
    if (!registration) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    // For singletons, return the cached instance if available
    if (registration.lifetime === Lifetime.SINGLETON && registration.instance) {
      return registration.instance as T;
    }

    // Resolve dependencies
    const dependencies = (registration.dependencies || []).map(dep => this.resolve(dep));
    
    // Create a new instance
    const instance = registration.factory(...dependencies);
    
    // Cache singleton instances
    if (registration.lifetime === Lifetime.SINGLETON) {
      registration.instance = instance;
    }
    
    return instance as T;
  }

  /**
   * Check if a service is registered with the container
   * @param token The token to check
   * @returns True if the service is registered
   */
  public has(token: string | symbol | Constructor): boolean {
    return this.registrations.has(token);
  }

  /**
   * Clear all registrations from the container
   */
  public clear(): void {
    this.registrations.clear();
  }
}

// Export a singleton instance of the container
export const container = Container.getInstance();
