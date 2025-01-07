import { Observable } from 'rxjs';

export type MessageType = 'user' | 'assistant' | 'system';
export type MessageStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface Message {
  id: string;
  type: MessageType;
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MessageValidationRules {
  maxContentLength: number;
  requiredFields: string[];
  allowedTypes: MessageType[];
}

export interface MessageProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
}

export interface MessageState {
  messages: Message[];
  isProcessing: boolean;
  error?: string;
  lastMessageId?: string;
}

export interface MessageServiceConfig {
  maxContentLength?: number;
  maxHistorySize?: number;
  persistenceEnabled?: boolean;
}

export interface MessageProcessor {
  processMessage(message: Message): Observable<MessageProcessingResult>;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ProcessingError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'ProcessingError';
  }
} 