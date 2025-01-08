/**
 * Dependency Injection Type Symbols and Interfaces
 * Centralized management of DI symbols and core interfaces
 */
import { interfaces } from 'inversify';

/**
 * Service Type Symbols for Dependency Resolution
 * Use Symbol.for to create unique, non-conflicting identifiers
 */
export const TYPES = {
  // Core Services
  TerminalManager: Symbol.for('TerminalManager'),
  BrowserSession: Symbol.for('BrowserSession'),
  AssistantMessageManager: Symbol.for('AssistantMessageManager'),
  
  // Utility Services
  Logger: Symbol.for('Logger'),
  ConfigurationManager: Symbol.for('ConfigurationManager'),
  
  // Extension Core
  ExtensionContext: Symbol.for('ExtensionContext'),
  OutputChannel: Symbol.for('OutputChannel'),
  
  // Webview Services
  ClineProvider: Symbol.for('ClineProvider'),
  WorkspaceTracker: Symbol.for('WorkspaceTracker'),
  McpHub: Symbol.for('McpHub'),
  
  // RxJS Services
  RxTerminalService: Symbol.for('RxTerminalService'),
  RxBrowserService: Symbol.for('RxBrowserService')
};

/**
 * Base interfaces for core services
 * Provides type-safe contracts for dependency injection
 */
export interface ILogger {
  log(message: string, level?: 'info' | 'warn' | 'error'): void;
  error(message: string, error?: Error): void;
}

export interface IConfigurationManager {
  get<T>(section: string): T | undefined;
  update(section: string, value: any): Promise<void>;
}

/**
 * Generic service interface for RxJS-based services
 */
export interface IRxService<T> {
  // Observable stream of service state
  state$: any; // Replace 'any' with appropriate RxJS Observable type
  
  // Lifecycle methods
  initialize(): Promise<void>;
  dispose(): Promise<void>;
  
  // Generic service operations
  execute(params: T): Promise<any>;
}

/**
 * Utility type for creating injectable services
 */
export type ServiceConstructor<T> = new (...args: any[]) => T;

/**
 * Dependency injection container configuration helper
 */
export interface IDIContainer {
  bind<T>(identifier: symbol): interfaces.BindingToSyntax<T>;
  get<T>(identifier: symbol): T;
  unbind(identifier: symbol): void;
  isBound(identifier: symbol): boolean;
}

/**
 * Error handling interface for DI services
 */
export interface IErrorHandler {
  handle(error: Error, context?: any): void;
  report(error: Error): void;
}
