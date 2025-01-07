import { Anthropic } from '@anthropic-ai/sdk';

export interface ConversationHistoryState {
  messages: Anthropic.MessageParam[];
  deletedRange?: [number, number];
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

export type ConversationHistoryResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: ConversationHistoryError;
}; 