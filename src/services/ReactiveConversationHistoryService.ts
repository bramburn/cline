import { BehaviorSubject, Observable, Subject, filter, map, shareReplay } from 'rxjs';
import { ClineMessage } from '../shared/ExtensionMessage';

export interface ReactiveConversationState {
  messages: ClineMessage[];
  isProcessing: boolean;
  error?: string;
}

export interface MessageEvent {
  type: 'add' | 'update' | 'delete';
  message: ClineMessage;
}

export class ReactiveConversationHistoryService {
  private stateSubject = new BehaviorSubject<ReactiveConversationState>({
    messages: [],
    isProcessing: false
  });

  private messageEventSubject = new Subject<MessageEvent>();

  private MAX_MESSAGES = 100; // Prevent excessive memory usage

  constructor() {
    // Set up message event processing
    this.messageEventSubject
      .pipe(
        map(event => {
          const currentState = this.stateSubject.value;
          let updatedMessages = [...currentState.messages];

          switch (event.type) {
            case 'add':
              updatedMessages.push(event.message);
              // Maintain maximum message limit
              if (updatedMessages.length > this.MAX_MESSAGES) {
                updatedMessages.shift();
              }
              break;
            case 'update':
              const index = updatedMessages.findIndex(m => m.ts === event.message.ts);
              if (index !== -1) {
                updatedMessages[index] = event.message;
              }
              break;
            case 'delete':
              updatedMessages = updatedMessages.filter(m => m.ts !== event.message.ts);
              break;
          }

          return {
            ...currentState,
            messages: updatedMessages
          };
        })
      )
      .subscribe(newState => this.stateSubject.next(newState));
  }

  // Add a new message
  addMessage(message: ClineMessage): void {
    this.messageEventSubject.next({ type: 'add', message });
  }

  // Update an existing message
  updateMessage(message: ClineMessage): void {
    this.messageEventSubject.next({ type: 'update', message });
  }

  // Delete a message
  deleteMessage(message: ClineMessage): void {
    this.messageEventSubject.next({ type: 'delete', message });
  }

  // Set processing state
  setProcessing(isProcessing: boolean): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, isProcessing });
  }

  // Set error state
  setError(error?: string): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, error });
  }

  // Get current state as an observable
  getState(): Observable<ReactiveConversationState> {
    return this.stateSubject.asObservable().pipe(
      shareReplay(1)
    );
  }

  // Get messages as an observable
  getMessages(): Observable<ClineMessage[]> {
    return this.getState().pipe(
      map(state => state.messages),
      shareReplay(1)
    );
  }

  // Dispose of the service
  dispose(): void {
    this.stateSubject.complete();
    this.messageEventSubject.complete();
  }

  getCurrentState(): ReactiveConversationState {
    return this.stateSubject.value;
  }
} 