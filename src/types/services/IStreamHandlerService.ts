import { Observable } from 'rxjs';

export interface StreamHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
}

export interface StreamChunk {
  content: string;
  isFinished: boolean;
  error?: Error;
}

export interface IStreamHandlerService {
  handleStream(
    stream: ReadableStream<Uint8Array> | null, 
    options?: StreamHandlerOptions
  ): Observable<StreamChunk>;

  cancelStream(): void;
  isStreamActive(): boolean;
} 