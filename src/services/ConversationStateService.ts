import { injectable } from 'inversify';
import { ClineMessage } from '../shared/ExtensionMessage';
import { ConversationState } from '../types/ConversationState';

@injectable()
export class ConversationStateService {
  private state: ConversationState = {
    messages: [],
    isProcessing: false
  };

  private listeners: ((state: ConversationState) => void)[] = [];

  public getCurrentState(): ConversationState {
    return { ...this.state };
  }

  public subscribe(listener: (state: ConversationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const currentState = this.getCurrentState();
    this.listeners.forEach(listener => listener(currentState));
  }

  public updateMessage(message: ClineMessage): void {
    const existingIndex = this.state.messages.findIndex(m => m.ts === message.ts);
    
    if (existingIndex === -1) {
      this.state.messages = [...this.state.messages, message];
    } else {
      this.state.messages = [
        ...this.state.messages.slice(0, existingIndex),
        message,
        ...this.state.messages.slice(existingIndex + 1)
      ];
    }
    
    this.state.lastMessageTs = message.ts;
    this.notifyListeners();
  }

  public setAskResponse(response: any, text?: string, images?: string[]): void {
    this.state = {
      ...this.state,
      askResponse: response,
      askResponseText: text,
      askResponseImages: images
    };
    this.notifyListeners();
  }

  public clearAskResponse(): void {
    const { askResponse, askResponseText, askResponseImages, ...rest } = this.state;
    this.state = rest;
    this.notifyListeners();
  }

  public setProcessing(isProcessing: boolean): void {
    this.state = {
      ...this.state,
      isProcessing
    };
    this.notifyListeners();
  }

  public setError(error?: string): void {
    this.state = {
      ...this.state,
      error
    };
    this.notifyListeners();
  }

  public clearMessages(): void {
    this.state = {
      ...this.state,
      messages: [],
      lastMessageTs: undefined
    };
    this.notifyListeners();
  }
} 