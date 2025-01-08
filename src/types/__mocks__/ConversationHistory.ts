import { Anthropic } from '@anthropic-ai/sdk';
import { ConversationHistoryState, ConversationHistoryOptions, ConversationHistoryError, ConversationHistoryResult } from '../ConversationHistory';

export const createMockHistoryState = (overrides: Partial<ConversationHistoryState> = {}): ConversationHistoryState => ({
  messages: [],
  ...overrides
});

export const createMockMessage = (overrides: Partial<Anthropic.MessageParam> = {}): Anthropic.MessageParam => ({
  role: 'user',
  content: 'Test message',
  ...overrides
});

export const createMockOptions = (overrides: Partial<ConversationHistoryOptions> = {}): ConversationHistoryOptions => ({
  taskDir: '/mock/task/dir',
  ...overrides
});

export const createMockError = (
  code: ConversationHistoryError['code'] = 'PERSISTENCE_ERROR',
  message: string = 'Mock error',
  originalError?: Error
): ConversationHistoryError => ({
  code,
  message,
  originalError
});

export const createMockResult = <T>(
  success: boolean,
  data?: T,
  error?: ConversationHistoryError
): ConversationHistoryResult<T> => {
  if (success) {
    return {
      success: true,
      data: data as T
    };
  }
  return {
    success: false,
    error: error || createMockError()
  };
};

export const mockErrorCodes = {
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  INVALID_STATE: 'INVALID_STATE',
  INITIALIZATION_ERROR: 'INITIALIZATION_ERROR'
} as const; 