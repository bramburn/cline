import { StreamHandlerService } from '../StreamHandlerService';
import { StreamController } from '../StreamController';

jest.mock('../StreamController');

describe('StreamHandlerService', () => {
  let service: StreamHandlerService;
  let mockStreamController: jest.Mocked<StreamController>;

  beforeEach(() => {
    mockStreamController = new StreamController() as jest.Mocked<StreamController>;
    service = new StreamHandlerService(mockStreamController);
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