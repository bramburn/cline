import { BehaviorSubject, Observable } from 'rxjs';
import { tap, distinctUntilChanged } from 'rxjs/operators';

export interface ClineState {
  isStreaming: boolean;
  abort: boolean;
  abandoned: boolean;
  consecutiveAutoApprovedRequestsCount: number;
  consecutiveMistakeCount: number;
}

export class ClineStateService {
  // Private BehaviorSubjects for state management
  private _isStreamingSubject = new BehaviorSubject<boolean>(false);
  private _abortSubject = new BehaviorSubject<boolean>(false);
  private _abandonedSubject = new BehaviorSubject<boolean>(false);
  private _consecutiveAutoApprovedRequestsSubject = new BehaviorSubject<number>(0);
  private _consecutiveMistakeCountSubject = new BehaviorSubject<number>(0);

  // Public observables for state tracking
  public isStreaming$: Observable<boolean> = this._isStreamingSubject.asObservable().pipe(
    distinctUntilChanged(),
    tap(value => this.logStateChange('isStreaming', value))
  );

  public abort$: Observable<boolean> = this._abortSubject.asObservable().pipe(
    distinctUntilChanged(),
    tap(value => this.logStateChange('abort', value))
  );

  public abandoned$: Observable<boolean> = this._abandonedSubject.asObservable().pipe(
    distinctUntilChanged(),
    tap(value => this.logStateChange('abandoned', value))
  );

  public consecutiveAutoApprovedRequests$: Observable<number> = this._consecutiveAutoApprovedRequestsSubject.asObservable().pipe(
    distinctUntilChanged(),
    tap(value => this.logStateChange('consecutiveAutoApprovedRequests', value))
  );

  public consecutiveMistakeCount$: Observable<number> = this._consecutiveMistakeCountSubject.asObservable().pipe(
    distinctUntilChanged(),
    tap(value => this.logStateChange('consecutiveMistakeCount', value))
  );

  // State update methods with validation
  public updateIsStreaming(value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid input: isStreaming must be a boolean');
    }
    this._isStreamingSubject.next(value);
  }

  public updateAbort(value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid input: abort must be a boolean');
    }
    this._abortSubject.next(value);
  }

  public updateAbandoned(value: boolean): void {
    if (typeof value !== 'boolean') {
      throw new Error('Invalid input: abandoned must be a boolean');
    }
    this._abandonedSubject.next(value);
  }

  public incrementConsecutiveAutoApprovedRequests(): void {
    const currentValue = this._consecutiveAutoApprovedRequestsSubject.value;
    this._consecutiveAutoApprovedRequestsSubject.next(currentValue + 1);
  }

  public resetConsecutiveAutoApprovedRequests(): void {
    this._consecutiveAutoApprovedRequestsSubject.next(0);
  }

  public incrementConsecutiveMistakeCount(): void {
    const currentValue = this._consecutiveMistakeCountSubject.value;
    this._consecutiveMistakeCountSubject.next(currentValue + 1);
  }

  public resetConsecutiveMistakeCount(): void {
    this._consecutiveMistakeCountSubject.next(0);
  }

  // Get current state snapshot
  public getCurrentState(): ClineState {
    return {
      isStreaming: this._isStreamingSubject.value,
      abort: this._abortSubject.value,
      abandoned: this._abandonedSubject.value,
      consecutiveAutoApprovedRequestsCount: this._consecutiveAutoApprovedRequestsSubject.value,
      consecutiveMistakeCount: this._consecutiveMistakeCountSubject.value
    };
  }

  // Logging method for state changes
  private logStateChange(stateName: string, value: any): void {
    console.log(`[ClineStateService] State Change: ${stateName} = ${value}`);
  }

  // Dispose method to clean up subscriptions if needed
  public dispose(): void {
    this._isStreamingSubject.complete();
    this._abortSubject.complete();
    this._abandonedSubject.complete();
    this._consecutiveAutoApprovedRequestsSubject.complete();
    this._consecutiveMistakeCountSubject.complete();
  }
}
