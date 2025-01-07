import { BehaviorSubject, Observable, Subject, filter, map, shareReplay } from 'rxjs';
import { ClineMessage } from '../shared/ExtensionMessage';
import { HistoryItem } from '../shared/HistoryItem';

export interface ReactiveConversationState {
  messages: ClineMessage[];
  lastMessageTs?: number;
  isProcessing: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageEvent {
  type: 'add' | 'update' | 'delete';
  message: ClineMessage;
  timestamp: number;
}

export class ReactiveConversationHistoryService {
  private stateSubject: BehaviorSubject<ReactiveConversationState>;
  private messageEvents: Subject<MessageEvent>;
  private readonly MAX_MESSAGES = 1000;

  constructor(historyItem?: HistoryItem) {
    this.stateSubject = new BehaviorSubject<ReactiveConversationState>({
      messages: historyItem?.messages || [],
      isProcessing: false
    });
    
    this.messageEvents = new Subject<MessageEvent>();
    this.initializeMessageEventHandler();
  }

  private initializeMessageEventHandler(): void {
    this.messageEvents.pipe(
      filter(event => !!event.message)
    ).subscribe(event => {
      const currentState = this.stateSubject.value;
      const messages = [...currentState.messages];

      switch (event.type) {
        case 'add':
          if (messages.length >= this.MAX_MESSAGES) {
            messages.shift(); // Remove oldest message if limit reached
          }
          messages.push(event.message);
          break;
        case 'update':
          const index = messages.findIndex(m => m.ts === event.message.ts);
          if (index !== -1) {
            messages[index] = event.message;
          }
          break;
        case 'delete':
          const deleteIndex = messages.findIndex(m => m.ts === event.message.ts);
          if (deleteIndex !== -1) {
            messages.splice(deleteIndex, 1);
          }
          break;
      }

      this.stateSubject.next({
        ...currentState,
        messages,
        lastMessageTs: event.timestamp
      });
    });
  }

  addMessage(message: ClineMessage): void {
    this.messageEvents.next({
      type: 'add',
      message,
      timestamp: Date.now()
    });
  }

  updateMessage(message: ClineMessage): void {
    this.messageEvents.next({
      type: 'update',
      message,
      timestamp: Date.now()
    });
  }

  deleteMessage(message: ClineMessage): void {
    this.messageEvents.next({
      type: 'delete',
      message,
      timestamp: Date.now()
    });
  }

  setProcessing(isProcessing: boolean): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      isProcessing
    });
  }

  setError(error: string | undefined): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      error
    });
  }

  getState(): Observable<ReactiveConversationState> {
    return this.stateSubject.asObservable().pipe(
      shareReplay(1)
    );
  }

  getMessages(): Observable<ClineMessage[]> {
    return this.getState().pipe(
      map(state => state.messages),
      shareReplay(1)
    );
  }

  getCurrentState(): ReactiveConversationState {
    return this.stateSubject.value;
  }

  dispose(): void {
    this.messageEvents.complete();
    this.stateSubject.complete();
  }
} 