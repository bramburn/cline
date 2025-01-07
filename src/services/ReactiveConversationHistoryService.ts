import { BehaviorSubject } from 'rxjs';

export interface ConversationMessage {
  id: string;
  content: string;
  timestamp: number;
  type: 'user' | 'assistant';
}

export interface ConversationState {
  messages: ConversationMessage[];
  isProcessing: boolean;
  error?: Error;
}

export class ReactiveConversationHistoryService {
  private state = new BehaviorSubject<ConversationState>({
    messages: [],
    isProcessing: false
  });

  private maxMessages = 100;

  constructor() {}

  public async addMessage(message: ConversationMessage): Promise<void> {
    const currentState = this.state.value;
    const messages = [...currentState.messages, message];
    
    if (messages.length > this.maxMessages) {
      messages.shift();
    }

    this.state.next({
      ...currentState,
      messages
    });
  }

  public async updateMessage(id: string, content: string): Promise<void> {
    const currentState = this.state.value;
    const messages = currentState.messages.map(msg => 
      msg.id === id ? { ...msg, content } : msg
    );

    this.state.next({
      ...currentState,
      messages
    });
  }

  public async deleteMessage(id: string): Promise<void> {
    const currentState = this.state.value;
    const messages = currentState.messages.filter(msg => msg.id !== id);

    this.state.next({
      ...currentState,
      messages
    });
  }

  public setProcessing(isProcessing: boolean): void {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      isProcessing
    });
  }

  public setError(error: Error): void {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      error
    });
  }

  public getState() {
    return this.state.asObservable();
  }

  public getCurrentState(): ConversationState {
    return this.state.value;
  }
} 