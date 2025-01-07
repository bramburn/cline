import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as fs from 'fs/promises';

export function withErrorHandling<T>(
  operation: string,
  fallbackValue?: T
): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) =>
    source.pipe(
      catchError(error => {
        console.error(`Error during ${operation}:`, error);
        return fallbackValue !== undefined ? of(fallbackValue) : throwError(() => error);
      })
    );
}

export function withLogging<T>(
  operation: string
): (source: Observable<T>) => Observable<T> {
  return (source: Observable<T>) =>
    source.pipe(
      tap({
        next: value => console.log(`${operation} completed successfully`),
        error: error => console.error(`${operation} failed:`, error)
      })
    );
} 