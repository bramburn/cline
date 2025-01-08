import { injectable } from 'inversify';
import { BehaviorSubject, Observable } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';
import { 
  IReactiveConversationHistoryService, 
  ReactiveConversationState, 
  ConversationHistoryResult, 
  ConversationHistoryError 
} from '../types/services/IReactiveConversationHistoryService';

@injectable()
export class ReactiveConversationHistoryService implements IReactiveConversationHistoryService {
  private _state: BehaviorSubject<ReactiveConversationState>;
  private _lastError: ConversationHistoryError | null = null;

  constructor() {
    this._state = new BehaviorSubject<ReactiveConversationState>({
      messages: [],
      lastUpdated: Date.now(),
      metadata: {}
    });
  }

  getCurrentState(): ReactiveConversationState {
    return this._state.getValue();
  }

  getStateUpdates(): Observable<ReactiveConversationState> {
    return this._state.asObservable();
  }

  addMessage(message: Anthropic.MessageParam): ConversationHistoryResult<void> {
    try {
      const currentState = this.getCurrentState();
      const updatedMessages = [...currentState.messages, message];
      
      this._state.next({
        ...currentState,
        messages: updatedMessages,
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INVALID_STATE',
        message: 'Failed to add message',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  updateLastMessage(updates: Partial<Anthropic.MessageParam>): ConversationHistoryResult<void> {
    try {
      const currentState = this.getCurrentState();
      if (currentState.messages.length === 0) {
        throw new Error('No messages to update');
      }

      const updatedMessages = [...currentState.messages];
      updatedMessages[updatedMessages.length - 1] = {
        ...updatedMessages[updatedMessages.length - 1],
        ...updates
      };

      this._state.next({
        ...currentState,
        messages: updatedMessages,
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INVALID_STATE',
        message: 'Failed to update last message',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  removeLastMessage(): ConversationHistoryResult<void> {
    try {
      const currentState = this.getCurrentState();
      if (currentState.messages.length === 0) {
        throw new Error('No messages to remove');
      }

      const updatedMessages = currentState.messages.slice(0, -1);

      this._state.next({
        ...currentState,
        messages: updatedMessages,
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INVALID_STATE',
        message: 'Failed to remove last message',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  saveCurrentState(): ConversationHistoryResult<string> {
    try {
      const currentState = this.getCurrentState();
      // In a real implementation, this would persist to a database or file
      const conversationId = `conversation_${Date.now()}`;
      
      // Simulating persistence
      localStorage.setItem(conversationId, JSON.stringify(currentState));

      return { success: true, data: conversationId };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'PERSISTENCE_ERROR',
        message: 'Failed to save conversation state',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  loadState(conversationId: string): ConversationHistoryResult<void> {
    try {
      const savedStateJson = localStorage.getItem(conversationId);
      if (!savedStateJson) {
        throw new Error('Conversation not found');
      }

      const savedState: ReactiveConversationState = JSON.parse(savedStateJson);
      
      this._state.next({
        ...savedState,
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INITIALIZATION_ERROR',
        message: 'Failed to load conversation state',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  updateMetadata(metadata: Record<string, any>): ConversationHistoryResult<void> {
    try {
      const currentState = this.getCurrentState();

      this._state.next({
        ...currentState,
        metadata: { ...currentState.metadata, ...metadata },
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INVALID_STATE',
        message: 'Failed to update metadata',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  setCurrentTaskDir(taskDir: string): ConversationHistoryResult<void> {
    try {
      const currentState = this.getCurrentState();

      this._state.next({
        ...currentState,
        currentTaskDir: taskDir,
        lastUpdated: Date.now()
      });

      return { success: true, data: undefined };
    } catch (error) {
      const historyError: ConversationHistoryError = {
        code: 'INVALID_STATE',
        message: 'Failed to set current task directory',
        originalError: error instanceof Error ? error : undefined
      };
      this._lastError = historyError;
      return { success: false, error: historyError };
    }
  }

  getLastError(): ConversationHistoryError | null {
    return this._lastError;
  }

  filterMessages(predicate: (message: Anthropic.MessageParam) => boolean): Anthropic.MessageParam[] {
    const currentState = this.getCurrentState();
    return currentState.messages.filter(predicate);
  }

  mapMessages<T>(mapper: (message: Anthropic.MessageParam) => T): T[] {
    const currentState = this.getCurrentState();
    return currentState.messages.map(mapper);
  }
} 