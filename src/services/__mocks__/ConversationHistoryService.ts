import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';
import { ConversationHistoryState, ConversationHistoryOptions, ConversationHistoryResult, ConversationHistoryError } from '../../types/ConversationHistory';

export class ConversationHistoryService {
  private historySubject: BehaviorSubject<ConversationHistoryState>;
  public history$: Observable<ConversationHistoryState>;
  private disposed: boolean = false;

  constructor(private options: ConversationHistoryOptions) {
    if (!options.taskDir) {
      throw new Error('Task directory is required');
    }

    this.historySubject = new BehaviorSubject<ConversationHistoryState>({
      messages: options.initialHistory || [],
    });
    this.history$ = this.historySubject.asObservable();
  }

  addMessage(message: Anthropic.MessageParam): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    const currentState = this.historySubject.value;
    this.historySubject.next({
      ...currentState,
      messages: [...currentState.messages, message]
    });

    return of({ success: true, data: undefined });
  }

  getCurrentHistory(): ConversationHistoryResult<Anthropic.MessageParam[]> {
    if (this.disposed) {
      return {
        success: false,
        error: this.createError('INVALID_STATE', 'Service has been disposed')
      };
    }
    return {
      success: true,
      data: this.historySubject.value.messages
    };
  }

  overwriteHistory(newHistory: Anthropic.MessageParam[]): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    this.historySubject.next({
      ...this.historySubject.value,
      messages: newHistory
    });

    return of({ success: true, data: undefined });
  }

  setDeletedRange(range?: [number, number]): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    this.historySubject.next({
      ...this.historySubject.value,
      deletedRange: range
    });

    return of({ success: true, data: undefined });
  }

  loadFromFile(): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    // Mock implementation always returns success with current state
    return of({ success: true, data: undefined });
  }

  private createError(
    code: ConversationHistoryError['code'],
    message: string,
    originalError?: Error
  ): ConversationHistoryError {
    return {
      code,
      message,
      originalError
    };
  }

  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      this.historySubject.complete();
    }
  }
} 