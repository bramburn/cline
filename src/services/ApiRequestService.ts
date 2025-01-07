import { injectable, inject } from 'inversify';
import { StreamController } from './StreamController';
import { TokenTrackingService } from './TokenTrackingService';
import { StreamHandlerService } from './StreamHandlerService';
import { ApiRequestMetrics } from './ApiRequestMetrics';
import { v4 as uuidv4 } from 'uuid';

export interface ApiRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  streamResponse?: boolean;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  requestId: string;
}

@injectable()
export class ApiRequestService {
  constructor(
    @inject(StreamController) private streamController: StreamController,
    @inject(TokenTrackingService) private tokenTracker: TokenTrackingService,
    @inject(StreamHandlerService) private streamHandler: StreamHandlerService,
    @inject(ApiRequestMetrics) private metrics: ApiRequestMetrics
  ) {}

  public async performRequest<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const requestId = uuidv4();
    this.metrics.startRequest(requestId, config.url);
    
    try {
      this.streamController.updateProgress(0);
      const controller = new AbortController();
      const timeoutId = config.timeout ? setTimeout(() => controller.abort(), config.timeout) : null;

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      this.streamController.updateProgress(50);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data: T;
      if (config.streamResponse && response.body) {
        data = await this.handleStreamResponse(response.body, requestId);
      } else {
        data = await response.json();
      }

      const headers = Object.fromEntries(response.headers.entries());

      // Track token usage if available in response headers
      const inputTokens = parseInt(headers['x-input-tokens'] || '0');
      const outputTokens = parseInt(headers['x-output-tokens'] || '0');
      if (inputTokens || outputTokens) {
        this.tokenTracker.trackUsage(inputTokens, outputTokens, requestId);
      }

      this.streamController.updateProgress(100);
      this.streamController.stop();
      
      this.metrics.completeRequest(requestId, true);

      return {
        data,
        status: response.status,
        headers,
        requestId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.streamController.error(error instanceof Error ? error : new Error(errorMessage));
      this.metrics.completeRequest(requestId, false, errorMessage);
      throw error;
    }
  }

  private async handleStreamResponse<T>(
    body: ReadableStream<Uint8Array>,
    requestId: string
  ): Promise<T> {
    const chunks: any[] = [];
    
    try {
      for await (const chunk of this.streamHandler.processStream(body)) {
        chunks.push(chunk.content);
        
        // If chunk contains token usage information, track it
        if (chunk.type === 'usage') {
          this.tokenTracker.trackUsage(
            chunk.content.inputTokens || 0,
            chunk.content.outputTokens || 0,
            requestId
          );
        }
      }
      
      return chunks.length === 1 ? chunks[0] : chunks;
    } catch (error) {
      await this.streamHandler.cancelStream(body);
      throw error;
    }
  }
} 