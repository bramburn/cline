import { Observable } from 'rxjs';
import { Anthropic } from '@anthropic-ai/sdk';

export interface ConversationHistoryEntry {
  id: string;
  messages: Anthropic.MessageParam[];
  timestamp: number;
  taskDir: string;
  metadata?: Record<string, any>;
}

export interface ConversationHistorySearchOptions {
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface IConversationHistoryService {
  // Core history management
  saveConversation(messages: Anthropic.MessageParam[], taskDir: string, metadata?: Record<string, any>): Promise<string>;
  getConversation(conversationId: string): Promise<ConversationHistoryEntry | null>;
  deleteConversation(conversationId: string): Promise<boolean>;
  
  // Search and filtering
  searchConversations(options?: ConversationHistorySearchOptions): Promise<ConversationHistoryEntry[]>;
  
  // Persistence and retrieval
  exportConversations(options?: ConversationHistorySearchOptions): Promise<string>; // Returns file path
  importConversations(filePath: string): Promise<number>; // Returns number of imported conversations
  
  // Metadata and tagging
  addMetadata(conversationId: string, metadata: Record<string, any>): Promise<boolean>;
  addTags(conversationId: string, tags: string[]): Promise<boolean>;
  
  // Reactive updates
  getConversationUpdates(): Observable<ConversationHistoryEntry>;
  
  // Cleanup and management
  pruneOldConversations(olderThan: Date): Promise<number>;
  clearAllConversations(): Promise<number>;
} 