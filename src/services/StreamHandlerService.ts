import { injectable, inject } from 'inversify';
import { StreamController } from './StreamController';
import { NotificationService } from './NotificationService';
import { ErrorCategory } from '../types/ErrorReporting';

export interface StreamChunk {
  type: string;
  content: any;
}

export interface StreamOptions {
  maxChunkSize?: number;
  timeout?: number;
}

interface ReadResult {
  done: boolean;
  value: Uint8Array | undefined;
}

@injectable()
export class StreamHandlerService {
  private readonly DEFAULT_CHUNK_SIZE = 1024;
  private readonly DEFAULT_TIMEOUT = 30000;

  constructor(
    @inject(StreamController) private streamController: StreamController,
    @inject(NotificationService) private notificationService: NotificationService
  ) {}

  public async *processStream(
    stream: ReadableStream<Uint8Array>,
    options: StreamOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    
    const maxChunkSize = options.maxChunkSize || this.DEFAULT_CHUNK_SIZE;
    const timeout = options.timeout || this.DEFAULT_TIMEOUT;

    try {
      while (true) {
        const readResult = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Stream timeout')), timeout)
          )
        ]);

        if (readResult.done) {
          if (buffer) {
            yield this.processChunk(buffer);
          }
          break;
        }

        buffer += decoder.decode(readResult.value, { stream: true });

        while (buffer.length >= maxChunkSize) {
          const chunk = buffer.slice(0, maxChunkSize);
          buffer = buffer.slice(maxChunkSize);
          yield this.processChunk(chunk);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.streamController.error(error instanceof Error ? error : new Error(errorMessage));
      
      this.notificationService.addErrorNotification({
        category: error instanceof Error && error.message.includes('timeout') 
          ? ErrorCategory.TIMEOUT 
          : ErrorCategory.UNKNOWN,
        message: `Stream Processing Failed: ${errorMessage}`,
        context: {
          toolName: 'browser_action',
          parameters: {
            chunkSize: maxChunkSize.toString(),
            timeout: timeout.toString()
          },
          timestamp: Date.now(),
          retryCount: 0
        },
        suggestions: [{
          toolName: 'browser_action',
          suggestedParameters: {
            chunkSize: maxChunkSize.toString(),
            timeout: (timeout + 10000).toString()
          },
          confidence: 0.7,
          reasoning: 'Increasing timeout and adjusting chunk size might help with stream processing'
        }]
      });
      
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  private processChunk(chunk: string): StreamChunk {
    try {
      const parsed = JSON.parse(chunk);
      return {
        type: parsed.type || 'unknown',
        content: parsed
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.notificationService.addErrorNotification({
        category: ErrorCategory.INVALID_PARAMETER,
        message: `Invalid Stream Chunk: ${errorMessage}`,
        context: {
          toolName: 'browser_action',
          parameters: {
            chunkContent: chunk.slice(0, 100) // Only include first 100 chars for context
          },
          timestamp: Date.now(),
          retryCount: 0
        },
        suggestions: []
      });
      
      return {
        type: 'text',
        content: chunk
      };
    }
  }

  public async cancelStream(stream: ReadableStream): Promise<void> {
    const reader = stream.getReader();
    try {
      await reader.cancel();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.notificationService.addErrorNotification({
        category: ErrorCategory.UNKNOWN,
        message: `Stream Cancellation Failed: ${errorMessage}`,
        context: {
          toolName: 'browser_action',
          parameters: {},
          timestamp: Date.now(),
          retryCount: 0
        },
        suggestions: []
      });
      throw error;
    } finally {
      reader.releaseLock();
    }
  }
} 