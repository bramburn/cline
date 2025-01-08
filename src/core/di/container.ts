/**
 * Dependency Injection Container Configuration
 * Centralized container setup for service management
 */
import 'reflect-metadata';
import { Container, interfaces } from 'inversify';
import { TYPES } from './types';

/**
 * Global DI Container
 * Manages service bindings and dependency resolution
 */
export class DIContainer {
  private static instance: Container;

  /**
   * Get or create a singleton container instance
   */
  public static getInstance(): Container {
    if (!DIContainer.instance) {
      DIContainer.instance = new Container({
        defaultScope: 'Singleton', // Most services will be singletons
        autoBindInjectable: true   // Automatically bind @injectable classes
      });
    }
    return DIContainer.instance;
  }

  /**
   * Bind a service to the container
   * @param identifier Symbol identifying the service
   * @param constructor Service constructor
   * @param options Optional binding configuration
   */
  public static bind<T>(
    identifier: symbol, 
    constructor: interfaces.Newable<T>, 
    options: {
      scope?: 'Transient' | 'Singleton' | 'Request';
      multiple?: boolean;
    } = {}
  ): void {
    const container = DIContainer.getInstance();
    const binding = container.bind<T>(identifier).to(constructor);

    switch (options.scope) {
      case 'Transient':
        binding.inTransientScope();
        break;
      case 'Request':
        binding.inRequestScope();
        break;
      default:
        binding.inSingletonScope();
    }

    if (options.multiple) {
      binding.whenTargetNamed(options.multiple.toString());
    }
  }

  /**
   * Resolve a service from the container
   * @param identifier Symbol identifying the service
   */
  public static resolve<T>(identifier: symbol): T {
    const container = DIContainer.getInstance();
    return container.get<T>(identifier);
  }

  /**
   * Check if a service is bound
   * @param identifier Symbol identifying the service
   */
  public static isBound(identifier: symbol): boolean {
    const container = DIContainer.getInstance();
    return container.isBound(identifier);
  }

  /**
   * Unbind a service from the container
   * @param identifier Symbol identifying the service
   */
  public static unbind(identifier: symbol): void {
    const container = DIContainer.getInstance();
    container.unbind(identifier);
  }

  /**
   * Reset the entire container
   * Use with caution, typically for testing
   */
  public static reset(): void {
    DIContainer.instance = new Container({
      defaultScope: 'Singleton',
      autoBindInjectable: true
    });
  }
}

// Export the container for direct imports if needed
export const container = DIContainer.getInstance();
