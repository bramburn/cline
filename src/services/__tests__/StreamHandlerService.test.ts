import { describe, it, expect, beforeEach } from 'vitest';
import { StreamHandlerService } from '../StreamHandlerService';
import { StreamController } from '../StreamController';
import { vi } from 'vitest';

vi.mock('../StreamController');

describe('StreamHandlerService', () => {
  let service: StreamHandlerService;
  let mockStreamController: ReturnType<typeof vi.mocked<StreamController>>;

  beforeEach(() => {
    mockStreamController = vi.mocked(new StreamController());
    service = new StreamHandlerService(mockStreamController);
  });

  it('should initialize without errors', () => {
    expect(service).toBeDefined();
  });

  it('should handle stream start', () => {
    const streamId = service.startStream();
    expect(streamId).toBeDefined();
    expect(typeof streamId).toBe('string');
  });

  it('should update stream progress', () => {
    const streamId = service.startStream();
    service.updateStreamProgress(streamId, 50);
    const streamState = service.getStreamState(streamId);
    expect(streamState?.progress).toBe(50);
  });

  it('should complete a stream', () => {
    const streamId = service.startStream();
    service.completeStream(streamId);
    const streamState = service.getStreamState(streamId);
    expect(streamState?.status).toBe('completed');
  });

  it('should handle stream errors', () => {
    const streamId = service.startStream();
    const errorMessage = 'Test error';
    service.errorStream(streamId, errorMessage);
    const streamState = service.getStreamState(streamId);
    expect(streamState?.status).toBe('error');
    expect(streamState?.errorMessage).toBe(errorMessage);
  });

  it('should process JSON stream chunks correctly', async () => {
    const mockData = [
      JSON.stringify({ type: 'text', content: 'Hello' }),
      JSON.stringify({ type: 'text', content: 'World' })
    ];

    const stream = createMockStream(mockData);
    const chunks = [];

    for await (const chunk of service.processStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      type: 'text',
      content: { type: 'text', content: 'Hello' }
    });
    expect(chunks[1]).toEqual({
      type: 'text',
      content: { type: 'text', content: 'World' }
    });
  });

  it('should handle non-JSON chunks as text', async () => {
    const mockData = ['Hello', 'World'];
    const stream = createMockStream(mockData);
    const chunks = [];

    for await (const chunk of service.processStream(stream)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      type: 'text',
      content: 'Hello'
    });
    expect(chunks[1]).toEqual({
      type: 'text',
      content: 'World'
    });
  });

  it('should handle stream timeout', async () => {
    const stream = createMockStream([], true);
    
    await expect(async () => {
      for await (const _ of service.processStream(stream, { timeout: 100 })) {
        // Should throw before yielding any chunks
      }
    }).rejects.toThrow('Stream timeout');
    
    expect(mockStreamController.error).toHaveBeenCalled();
  });

  it('should cancel stream successfully', async () => {
    const stream = createMockStream([]);
    await service.cancelStream(stream);
    // Successful if no error is thrown
  });

  // Helper function to create a mock ReadableStream
  function createMockStream(
    data: string[],
    shouldTimeout: boolean = false
  ): ReadableStream<Uint8Array> {
    return new ReadableStream({
      async start(controller) {
        if (shouldTimeout) {
          // Simulate timeout by not sending any data
          return;
        }

        for (const chunk of data) {
          controller.enqueue(new TextEncoder().encode(chunk));
        }
        controller.close();
      }
    });
  }
});