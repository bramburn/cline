import { Observable } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';

export interface ReactiveConversationState {
  messages: Anthropic.MessageParam[];
  currentTaskDir?: string;
  lastUpdated: number;
  metadata?: Record<string, any>;
}

export interface ConversationHistoryOptions {
  taskDir: string;
  initialHistory?: Anthropic.MessageParam[];
}

export interface ConversationHistoryError {
  code: 'PERSISTENCE_ERROR' | 'INVALID_STATE' | 'INITIALIZATION_ERROR';
  message: string;
  originalError?: Error;
}

export type ConversationHistoryResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ConversationHistoryError };

export interface IReactiveConversationHistoryService {
  // State Management
  getCurrentState(): ReactiveConversationState;
  getStateUpdates(): Observable<ReactiveConversationState>;
  
  // Conversation Manipulation
  addMessage(message: Anthropic.MessageParam): ConversationHistoryResult<void>;
  updateLastMessage(updates: Partial<Anthropic.MessageParam>): ConversationHistoryResult<void>;
  removeLastMessage(): ConversationHistoryResult<void>;
  
  // Persistence
  saveCurrentState(): ConversationHistoryResult<string>; // Returns conversation ID
  loadState(conversationId: string): ConversationHistoryResult<void>;
  
  // Metadata Management
  updateMetadata(metadata: Record<string, any>): ConversationHistoryResult<void>;
  
  // Task Management
  setCurrentTaskDir(taskDir: string): ConversationHistoryResult<void>;
  
  // Error Handling
  getLastError(): ConversationHistoryError | null;
  
  // Reactive Transformations
  filterMessages(predicate: (message: Anthropic.MessageParam) => boolean): Anthropic.MessageParam[];
  mapMessages<T>(mapper: (message: Anthropic.MessageParam) => T): T[];
} 