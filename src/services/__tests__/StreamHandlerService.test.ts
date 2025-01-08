import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StreamHandlerService } from '../StreamHandlerService';
import { StreamController } from '../StreamController';
import { NotificationService } from '../NotificationService';
import { ErrorCategory } from '../../types/ErrorReporting';

// Import our new mocks
import { 
  mockStreamChunk, 
  mockStreamOptions, 
  mockReadableStream,
  mockStreamHandlerService 
} from '../__mocks__/StreamHandlerService';
import { mockStreamController } from '../__mocks__/StreamController';
import { mockNotificationService } from '../__mocks__/NotificationService';

describe('StreamHandlerService', () => {
  let service: StreamHandlerService;
  let mockController: StreamController;
  let mockNotification: NotificationService;

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Create mocked dependencies
    mockController = mockStreamController as unknown as StreamController;
    mockNotification = mockNotificationService as unknown as NotificationService;

    // Initialize the service with mocked dependencies
    service = new StreamHandlerService(mockController, mockNotification);
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

    console.log('Test: Mocked Stream:', mockStream);
    console.log('Test: Mock Stream Chunk:', mockStreamChunk);

    const chunks = [];
    for await (const chunk of service.processStream(mockStream, mockStreamOptions)) {
      console.log('Test: Received Chunk:', chunk);
      chunks.push(chunk);
    }

    console.log('Test: Processed Chunks:', chunks);

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
    expect(mockController.error).toHaveBeenCalled();
    expect(mockNotification.addErrorNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        category: ErrorCategory.TIMEOUT,
        message: expect.stringContaining('Stream Processing Failed')
      })
    );
  });

  it('should cancel stream successfully', async () => {
    const mockStream = mockReadableStream as unknown as ReadableStream<Uint8Array>;
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