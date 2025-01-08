import { vi } from 'vitest';
import { StreamChunk, StreamOptions } from '../StreamHandlerService';
import { ErrorCategory } from '../../types/ErrorReporting';

export const mockStreamChunk: StreamChunk = {
  type: 'mock_type',
  content: { mock: 'content' }
};

export const mockStreamOptions: StreamOptions = {
  maxChunkSize: 1024,
  timeout: 30000
};

export const mockReadResult = {
  done: false,
  value: new TextEncoder().encode('mock stream data')
};

export const mockReadableStream = {
  getReader: vi.fn().mockReturnValue({
    read: vi.fn().mockResolvedValue(mockReadResult),
    cancel: vi.fn(),
    releaseLock: vi.fn()
  })
};

export const mockTextDecoder = {
  decode: vi.fn().mockReturnValue('decoded mock data')
};

export const mockStreamHandlerService = {
  processStream: vi.fn().mockImplementation(async function* (
    stream: ReadableStream<Uint8Array>, 
    options: StreamOptions = {}
  ) {
    yield mockStreamChunk;
  }),
  cancelStream: vi.fn().mockResolvedValue(undefined)
};

export const mockErrorNotification = {
  category: ErrorCategory.UNKNOWN,
  message: 'Mock Stream Error',
  context: {
    toolName: 'mock_tool',
    parameters: {},
    timestamp: Date.now(),
    retryCount: 0
  },
  suggestions: [{
    toolName: 'mock_tool',
    suggestedParameters: {},
    confidence: 0.5,
    reasoning: 'Mock suggestion'
  }]
};
