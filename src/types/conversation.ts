export type MessageType = 'user' | 'assistant';

export interface ConversationMessage {
  id: string;
  content: string;
  timestamp: number;
  type: MessageType;
  metadata?: Record<string, unknown>;
}

export interface ConversationState {
  messages: ConversationMessage[];
  isProcessing: boolean;
  error?: Error;
  metadata?: {
    lastUpdated: number;
    messageCount: number;
  };
}

export interface MessageValidationRules {
  maxContentLength: number;
  requiredFields: string[];
  allowedTypes: MessageType[];
}

export class ConversationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationError';
  }
}

export class ValidationError extends ConversationError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
} 