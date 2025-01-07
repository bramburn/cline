import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ConversationMessage,
  ConversationState,
  MessageValidationRules,
  ValidationError,
  ConversationError
} from '../types/conversation';

export class ReactiveConversationHistoryService {
  private state = new BehaviorSubject<ConversationState>({
    messages: [],
    isProcessing: false
  });

  private readonly maxMessages = 100;
  private readonly validationRules: MessageValidationRules = {
    maxContentLength: 10000,
    requiredFields: ['id', 'content', 'type', 'timestamp'],
    allowedTypes: ['user', 'assistant']
  };

  constructor() {}

  public getMessages(): Observable<ConversationMessage[]> {
    return this.state.pipe(
      map(state => state.messages)
    );
  }

  public getState(): Observable<ConversationState> {
    return this.state.asObservable();
  }

  private validateMessage(message: ConversationMessage): void {
    // Check required fields
    for (const field of this.validationRules.requiredFields) {
      if (!(field in message)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }

    // Validate content length
    if (message.content.length > this.validationRules.maxContentLength) {
      throw new ValidationError(`Content exceeds maximum length of ${this.validationRules.maxContentLength}`);
    }

    // Validate message type
    if (!this.validationRules.allowedTypes.includes(message.type)) {
      throw new ValidationError(`Invalid message type: ${message.type}`);
    }
  }

  public async addMessage(message: ConversationMessage): Promise<void> {
    try {
      this.setProcessing(true);
      this.validateMessage(message);

      const currentState = this.state.value;
      const messages = [...currentState.messages, message];
      
      // Handle overflow
      if (messages.length > this.maxMessages) {
        messages.shift();
      }

      this.updateState({
        messages,
        metadata: {
          lastUpdated: Date.now(),
          messageCount: messages.length
        }
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.setProcessing(false);
    }
  }

  public async updateMessage(id: string, content: string): Promise<void> {
    try {
      this.setProcessing(true);
      const currentState = this.state.value;
      const messageIndex = currentState.messages.findIndex(msg => msg.id === id);

      if (messageIndex === -1) {
        throw new ConversationError(`Message with id ${id} not found`);
      }

      const updatedMessage = {
        ...currentState.messages[messageIndex],
        content
      };

      this.validateMessage(updatedMessage);

      const messages = [...currentState.messages];
      messages[messageIndex] = updatedMessage;

      this.updateState({
        messages,
        metadata: {
          lastUpdated: Date.now(),
          messageCount: messages.length
        }
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.setProcessing(false);
    }
  }

  public async deleteMessage(id: string): Promise<void> {
    try {
      this.setProcessing(true);
      const currentState = this.state.value;
      const messages = currentState.messages.filter(msg => msg.id !== id);

      if (messages.length === currentState.messages.length) {
        throw new ConversationError(`Message with id ${id} not found`);
      }

      this.updateState({
        messages,
        metadata: {
          lastUpdated: Date.now(),
          messageCount: messages.length
        }
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.setProcessing(false);
    }
  }

  public async clearHistory(): Promise<void> {
    try {
      this.setProcessing(true);
      this.updateState({
        messages: [],
        metadata: {
          lastUpdated: Date.now(),
          messageCount: 0
        }
      });
    } catch (error) {
      this.handleError(error);
      throw error;
    } finally {
      this.setProcessing(false);
    }
  }

  private setProcessing(isProcessing: boolean): void {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      isProcessing
    });
  }

  private handleError(error: unknown): void {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      error: error instanceof Error ? error : new Error(String(error))
    });
  }

  private updateState(partialState: Partial<ConversationState>): void {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      ...partialState,
      error: undefined // Clear any previous errors
    });
  }
} 