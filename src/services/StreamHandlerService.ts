import { injectable } from 'inversify';
import { StreamController } from './StreamController';

export interface StreamChunk {
  type: string;
  content: any;
}

export interface StreamOptions {
  maxChunkSize?: number;
  timeout?: number;
}

@injectable()
export class StreamHandlerService {
  private readonly DEFAULT_CHUNK_SIZE = 1024;
  private readonly DEFAULT_TIMEOUT = 30000;

  constructor(private streamController: StreamController) {}

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
        const { done, value } = await Promise.race([
          reader.read(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Stream timeout')), timeout)
          )
        ]);

        if (done) {
          if (buffer) {
            yield this.processChunk(buffer);
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        while (buffer.length >= maxChunkSize) {
          const chunk = buffer.slice(0, maxChunkSize);
          buffer = buffer.slice(maxChunkSize);
          yield this.processChunk(chunk);
        }
      }
    } catch (error) {
      this.streamController.error(error instanceof Error ? error : new Error(String(error)));
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
    } catch {
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
    } finally {
      reader.releaseLock();
    }
  }
} 