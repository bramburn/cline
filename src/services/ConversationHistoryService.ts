import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { catchError, debounceTime, map, switchMap, tap } from 'rxjs/operators';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { GlobalFileNames } from '../core/webview/ClineProvider';

export class ConversationHistoryService {
  private historySubject: BehaviorSubject<Anthropic.MessageParam[]>;
  public history$: Observable<Anthropic.MessageParam[]>;

  constructor(private taskDir: string, initialHistory: Anthropic.MessageParam[] = []) {
    if (!taskDir) {
      throw new Error('Task directory is required');
    }
    this.historySubject = new BehaviorSubject<Anthropic.MessageParam[]>(initialHistory);
    this.history$ = this.historySubject.asObservable();
  }

  addMessage(message: Anthropic.MessageParam): Observable<void> {
    return of(message).pipe(
      tap(msg => {
        const currentHistory = this.historySubject.value;
        this.historySubject.next([...currentHistory, msg]);
      }),
      switchMap(() => this.persistToFile()),
      catchError(error => {
        console.error('Failed to add message to history:', error);
        return of(undefined);
      })
    );
  }

  private persistToFile(): Observable<void> {
    return of(this.historySubject.value).pipe(
      debounceTime(300),
      map(history => {
        const filePath = path.join(this.taskDir, GlobalFileNames.apiConversationHistory);
        return fs.writeFile(filePath, JSON.stringify(history));
      }),
      switchMap(promise => from(promise)),
      catchError(error => {
        console.error('Failed to persist conversation history:', error);
        return of(undefined);
      })
    );
  }

  getCurrentHistory(): Anthropic.MessageParam[] {
    return this.historySubject.value;
  }

  dispose(): void {
    this.historySubject.complete();
  }
} 