import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamHandlerService } from '../StreamHandlerService';
import { StreamController } from '../StreamController';
import { NotificationService } from '../NotificationService';
import { ErrorCategory } from '../../types/ErrorReporting';

// Explicitly mock dependencies
vi.mock('../StreamController', () => ({
  StreamController: vi.fn().mockImplementation(() => ({
    error: vi.fn(),
    updateProgress: vi.fn(),
  }))
}));

vi.mock('../NotificationService', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    addErrorNotification: vi.fn(),
  }))
}));

// Import our new mocks
import { 
  mockStreamChunk, 
  mockStreamOptions, 
  mockReadableStream 
} from '../__mocks__/StreamHandlerService';

describe('StreamHandlerService', () => {
  let service: StreamHandlerService;
  let mockStreamController: StreamController;
  let mockNotificationService: NotificationService;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Create mocked dependencies
    mockStreamController = new StreamController();
    mockNotificationService = new NotificationService();

    // Initialize the service with mocked dependencies
    service = new StreamHandlerService(mockStreamController, mockNotificationService);
  });

  it('should process stream chunks correctly', async () => {
    // Create a more robust mock stream
    const mockStream = {
      getReader: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({
          done: false,
          value: new TextEncoder().encode(JSON.stringify(mockStreamChunk.content))
        }),
        releaseLock: vi.fn(),
        cancel: vi.fn()
      })
    } as unknown as ReadableStream<Uint8Array>;

    const chunks = [];
    for await (const chunk of service.processStream(mockStream, mockStreamOptions)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toEqual({
      type: 'mock_type',
      content: mockStreamChunk.content
    });

    // Verify reader methods were called
    const reader = mockStream.getReader();
    expect(reader.read).toHaveBeenCalled();
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it('should handle stream timeout', async () => {
    const mockStream = {
      getReader: vi.fn().mockReturnValue({
        read: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Stream timeout')), 50);
          });
        }),
        releaseLock: vi.fn()
      })
    } as unknown as ReadableStream<Uint8Array>;

    await expect(async () => {
      for await (const _ of service.processStream(mockStream, { timeout: 10 })) {
        // Should throw before yielding any chunks
      }
    }).rejects.toThrow('Stream timeout');

    // Verify error handling
    expect(mockStreamController.error).toHaveBeenCalled();
    expect(mockNotificationService.addErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ErrorCategory.TIMEOUT,
        message: expect.stringContaining('Stream Processing Failed')
      })
    );
  });

  it('should cancel stream successfully', async () => {
    const mockStream = {
      getReader: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({ done: true }),
        releaseLock: vi.fn(),
        cancel: vi.fn()
      })
    } as unknown as ReadableStream<Uint8Array>;

    await service.cancelStream(mockStream);

    // Verify cancellation
    const reader = mockStream.getReader();
    expect(reader.cancel).toHaveBeenCalled();
    expect(reader.releaseLock).toHaveBeenCalled();
  });

  it('should handle non-JSON chunks', async () => {
    const nonJsonStream = {
      getReader: vi.fn().mockReturnValue({
        read: vi.fn().mockResolvedValue({
          done: false,
          value: new TextEncoder().encode('non-json chunk')
        }),
        releaseLock: vi.fn()
      })
    } as unknown as ReadableStream<Uint8Array>;

    const chunks = [];
    for await (const chunk of service.processStream(nonJsonStream)) {
      chunks.push(chunk);
    }

    // Verify that non-JSON chunks are processed as text
    expect(chunks[0]).toEqual({
      type: 'text',
      content: 'non-json chunk'
    });
  });
});