/**
 * RxJS-based Service Base Classes and Utilities
 * Provides foundational reactive service infrastructure
 */
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { injectable } from 'inversify';

/**
 * Base abstract class for RxJS-powered services
 * Provides common reactive service patterns
 */
@injectable()
export abstract class RxService<T> {
  // Internal state management
  protected _state$: BehaviorSubject<T>;
  protected _destroy$: Subject<void> = new Subject<void>();

  constructor(initialState: T) {
    this._state$ = new BehaviorSubject<T>(initialState);
  }

  /**
   * Observable stream of current service state
   */
  get state$(): Observable<T> {
    return this._state$.asObservable()
      .pipe(takeUntil(this._destroy$));
  }

  /**
   * Get current service state snapshot
   */
  get currentState(): T {
    return this._state$.getValue();
  }

  /**
   * Update service state
   * @param newState Partial or full state update
   */
  protected updateState(newState: Partial<T>): void {
    this._state$.next({
      ...this.currentState,
      ...newState
    });
  }

  /**
   * Initialize service
   * Override in child classes for specific initialization
   */
  async initialize(): Promise<void> {
    // Default no-op implementation
  }

  /**
   * Dispose of service resources
   * Completes destroy subject to stop all streams
   */
  async dispose(): Promise<void> {
    this._destroy$.next();
    this._destroy$.complete();
  }

  /**
   * Abstract method for core service execution
   * Must be implemented by child classes
   */
  abstract execute(params: any): Promise<any>;
}

/**
 * Error handling utility for RxJS services
 */
export class RxErrorHandler {
  private _errors$: Subject<Error> = new Subject<Error>();

  /**
   * Observable stream of errors
   */
  get errors$(): Observable<Error> {
    return this._errors$.asObservable();
  }

  /**
   * Handle and log an error
   * @param error Error to handle
   * @param context Optional context for error
   */
  handle(error: Error, context?: any): void {
    console.error('RxJS Service Error:', error, context);
    this._errors$.next(error);
  }

  /**
   * Report an error without additional processing
   * @param error Error to report
   */
  report(error: Error): void {
    this._errors$.next(error);
  }
}

/**
 * Utility functions for RxJS service management
 */
export const RxServiceUtils = {
  /**
   * Safe error handler with optional logging
   */
  safeExecute: async <T>(
    fn: () => Promise<T>, 
    errorHandler?: (error: Error) => void
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      }
      return null;
    }
  },

  /**
   * Retry an observable operation with backoff
   */
  retryWithBackoff: <T>(
    maxRetries: number = 3, 
    baseDelay: number = 1000
  ) => (source: Observable<T>) => {
    // Implement retry logic with exponential backoff
    // This is a placeholder - implement full retry mechanism
    return source;
  }
};
