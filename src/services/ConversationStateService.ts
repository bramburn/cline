import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ClineMessage } from '../shared/ExtensionMessage';
import { HistoryItem } from '../shared/HistoryItem';

export interface ConversationState {
  messages: ClineMessage[];
  lastMessageTs?: number;
  askResponse?: any;
  askResponseText?: string;
  askResponseImages?: string[];
  isProcessing: boolean;
  error?: string;
}

export class ConversationStateService {
  private stateSubject: BehaviorSubject<ConversationState>;

  constructor(historyItem?: HistoryItem) {
    this.stateSubject = new BehaviorSubject<ConversationState>({
      messages: historyItem?.messages || [],
      isProcessing: false
    });
  }

  setState(state: Partial<ConversationState>) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      ...state
    });
  }

  updateMessage(message: ClineMessage) {
    const currentState = this.stateSubject.value;
    const messages = [...currentState.messages];
    const existingIndex = messages.findIndex(m => m.ts === message.ts);

    if (existingIndex !== -1) {
      messages[existingIndex] = message;
    } else {
      messages.push(message);
    }

    this.stateSubject.next({
      ...currentState,
      messages,
      lastMessageTs: message.ts
    });
  }

  setAskResponse(response: any, text?: string, images?: string[]) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      askResponse: response,
      askResponseText: text,
      askResponseImages: images
    });
  }

  clearAskResponse() {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      askResponse: undefined,
      askResponseText: undefined,
      askResponseImages: undefined
    });
  }

  setProcessing(isProcessing: boolean) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      isProcessing
    });
  }

  setError(error: string | undefined) {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({
      ...currentState,
      error
    });
  }

  getState(): Observable<ConversationState> {
    return this.stateSubject.asObservable();
  }

  getMessages(): Observable<ClineMessage[]> {
    return this.getState().pipe(
      map(state => state.messages)
    );
  }

  getCurrentState(): ConversationState {
    return this.stateSubject.value;
  }

  dispose() {
    if (this.stateSubject) {
      this.stateSubject.complete();
    }
  }
} 