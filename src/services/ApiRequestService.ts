import { Observable, from, of, throwError } from 'rxjs';
import { catchError, concatMap, finalize, map, takeUntil, toArray } from 'rxjs/operators';
import { ApiStream, ApiStreamChunk } from '../api/transform/stream';
import { StreamController } from './StreamController';
import { withErrorHandling, withLogging } from '../utils/rxjs-operators';

export interface ApiRequestOptions {
  systemPrompt: string;
  conversationHistory: any[];
  previousApiReqIndex: number;
  mcpHub?: any;
  abort$?: Observable<boolean>;
}

export class ApiRequestService {
  private streamController: StreamController;

  constructor(streamController?: StreamController) {
    this.streamController = streamController || new StreamController();
  }

  /**
   * Perform an API request with RxJS Observable management
   * @param api The API handler to use for creating the message
   * @param options Configuration options for the API request
   * @returns Observable of API stream chunks
   */
  performApiRequest(
    api: { createMessage: (systemPrompt: string, history: any[]) => AsyncGenerator<ApiStreamChunk> },
    options: ApiRequestOptions
  ): Observable<ApiStreamChunk> & AsyncIterable<ApiStreamChunk> {
    // Start processing
    this.streamController.updateProgress({ 
      status: 'processing', 
      processed: 0 
    });

    // Convert the async generator to an Observable
    const apiStream$ = from(
      this.attemptApiRequest(api, options)
    ).pipe(
      // Use concatMap to process chunks sequentially
      concatMap(chunk => {
        // Update progress for text chunks
        if (chunk.type === 'text') {
          this.streamController.updateProgress({ 
            processed: (this.streamController.getCurrentProgress().processed || 0) + 1 
          });
        }
        return of(chunk);
      }),
      // Optional cancellation using takeUntil
      takeUntil(options.abort$ || of(false)),
      // Error handling
      catchError(error => {
        this.streamController.updateProgress({ 
          status: 'error', 
          error: error.message 
        });
        return throwError(() => error);
      }),
      // Ensure cleanup happens
      finalize(() => {
        this.streamController.updateProgress({ 
          status: 'completed' 
        });
      }),
      // Add logging and error handling
      withLogging('API Request'),
      withErrorHandling('API Request')
    );

    // Add async iterator support
    (apiStream$ as any)[Symbol.asyncIterator] = async function* () {
      const chunks = await apiStream$.pipe(toArray()).toPromise();
      for (const chunk of chunks) {
        yield chunk;
      }
    };

    return apiStream$ as Observable<ApiStreamChunk> & AsyncIterable<ApiStreamChunk>;
  }

  /**
   * Internal method to attempt the API request
   * @param api API handler
   * @param options Request options
   * @returns AsyncGenerator of API stream chunks
   */
  private async *attemptApiRequest(
    api: { createMessage: (systemPrompt: string, history: any[]) => AsyncGenerator<ApiStreamChunk> },
    options: ApiRequestOptions
  ): ApiStream {
    const { systemPrompt, conversationHistory } = options;

    // Create the message stream
    const stream = api.createMessage(systemPrompt, conversationHistory);
    const iterator = stream[Symbol.asyncIterator]();

    try {
      // Await first chunk to check for immediate errors
      const firstChunk = await iterator.next();
      yield firstChunk.value;
    } catch (error) {
      // Handle first chunk error
      throw error;
    }

    // Yield remaining chunks
    yield* iterator;
  }

  /**
   * Get the stream controller for monitoring request progress
   */
  getStreamController(): StreamController {
    return this.streamController;
  }
} 