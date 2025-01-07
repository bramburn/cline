import { BehaviorSubject, Observable, from, of, throwError } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { GlobalFileNames } from '../core/webview/ClineProvider';
import { ConversationHistoryError, ConversationHistoryOptions, ConversationHistoryResult, ConversationHistoryState } from '../types/ConversationHistory';
import { fileExistsAtPath } from '../utils/fs';

export class ConversationHistoryService {
  private historySubject: BehaviorSubject<ConversationHistoryState>;
  public history$: Observable<ConversationHistoryState>;
  private disposed = false;

  constructor(private options: ConversationHistoryOptions) {
    if (!options.taskDir) {
      throw new Error('Task directory is required');
    }

    this.historySubject = new BehaviorSubject<ConversationHistoryState>({
      messages: options.initialHistory || [],
    });
    this.history$ = this.historySubject.asObservable();
  }

  /**
   * Add a new message to the conversation history
   */
  addMessage(message: Anthropic.MessageParam): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    return of(message).pipe(
      tap(msg => {
        const currentState = this.historySubject.value;
        this.historySubject.next({
          ...currentState,
          messages: [...currentState.messages, msg]
        });
      }),
      switchMap(() => this.persistToFile()),
      map(() => ({ success: true as const, data: undefined })),
      catchError(error => of({
        success: false as const,
        error: this.createError('PERSISTENCE_ERROR', 'Failed to add message to history', error)
      }))
    );
  }

  /**
   * Get the current conversation history
   */
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

  /**
   * Overwrite the entire conversation history
   */
  overwriteHistory(newHistory: Anthropic.MessageParam[]): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    return of(newHistory).pipe(
      tap(history => {
        const currentState = this.historySubject.value;
        this.historySubject.next({
          ...currentState,
          messages: history
        });
      }),
      switchMap(() => this.persistToFile()),
      map(() => ({ success: true as const, data: undefined })),
      catchError(error => of({
        success: false as const,
        error: this.createError('PERSISTENCE_ERROR', 'Failed to overwrite history', error)
      }))
    );
  }

  /**
   * Set the deleted range in the conversation history
   */
  setDeletedRange(range?: [number, number]): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    return of(range).pipe(
      tap(newRange => {
        const currentState = this.historySubject.value;
        this.historySubject.next({
          ...currentState,
          deletedRange: newRange
        });
      }),
      switchMap(() => this.persistToFile()),
      map(() => ({ success: true as const, data: undefined })),
      catchError(error => of({
        success: false as const,
        error: this.createError('PERSISTENCE_ERROR', 'Failed to set deleted range', error)
      }))
    );
  }

  /**
   * Load conversation history from file
   */
  loadFromFile(): Observable<ConversationHistoryResult<void>> {
    if (this.disposed) {
      return throwError(() => this.createError('INVALID_STATE', 'Service has been disposed'));
    }

    return from(this.readHistoryFile()).pipe(
      tap(history => {
        if (history.success) {
          this.historySubject.next(history.data);
        }
      }),
      map(() => ({ success: true as const, data: undefined })),
      catchError(error => of({
        success: false as const,
        error: this.createError('PERSISTENCE_ERROR', 'Failed to load history from file', error)
      }))
    );
  }

  /**
   * Persist the current state to file
   */
  private persistToFile(): Observable<void> {
    return of(this.historySubject.value).pipe(
      debounceTime(300),
      map(state => {
        const filePath = path.join(this.options.taskDir, GlobalFileNames.apiConversationHistory);
        return fs.writeFile(filePath, JSON.stringify(state));
      }),
      switchMap(promise => from(promise))
    );
  }

  /**
   * Read history from file
   */
  private async readHistoryFile(): Promise<ConversationHistoryResult<ConversationHistoryState>> {
    try {
      const filePath = path.join(this.options.taskDir, GlobalFileNames.apiConversationHistory);
      const exists = await fileExistsAtPath(filePath);
      
      if (!exists) {
        return {
          success: true,
          data: { messages: [] }
        };
      }

      const content = await fs.readFile(filePath, 'utf8');
      const state = JSON.parse(content) as ConversationHistoryState;
      
      return {
        success: true,
        data: state
      };
    } catch (error) {
      return {
        success: false,
        error: this.createError('PERSISTENCE_ERROR', 'Failed to read history file', error as Error)
      };
    }
  }

  /**
   * Create a standardized error object
   */
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

  /**
   * Clean up resources
   */
  dispose(): void {
    if (!this.disposed) {
      this.disposed = true;
      this.historySubject.complete();
    }
  }
} 