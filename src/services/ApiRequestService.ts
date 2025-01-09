import { injectable, inject } from 'inversify';
import { StreamController } from './StreamController';
import { TokenTrackingService } from './TokenTrackingService';
import { StreamHandlerService } from './StreamHandlerService';
import { ApiRequestMetrics } from './ApiRequestMetrics';
import { NotificationService } from './NotificationService';
import { ErrorCategory } from '../types/ErrorReporting';
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
    @inject(ApiRequestMetrics) private metrics: ApiRequestMetrics,
    @inject(NotificationService) private notificationService: NotificationService
  ) {}

  public async performRequest<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    console.log('performRequest called:', config);
    const requestId = uuidv4();
    console.log('Generated requestId:', requestId);
    if (this.metrics) {
      this.metrics.startRequest(requestId, config.url);
      console.log('Metrics started for request:', requestId);
    }
    
    // Ensure unique progress updates
    const uniqueProgressUpdates = new Set<number>();
    const updateProgress = (progress: number) => {
      if (!uniqueProgressUpdates.has(progress)) {
        uniqueProgressUpdates.add(progress);
        this.streamController.updateProgress(progress);
      }
    };

    try {
      updateProgress(0);
      console.log('Stream progress updated to 0');
      const controller = new AbortController();
      console.log('AbortController created');
      const timeoutId = config.timeout ? setTimeout(() => {
        console.log('Request timed out, aborting:', requestId);
        controller.abort();
      }, config.timeout) : null;
      console.log('Timeout set:', config.timeout);

      const response = await fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });
      console.log('Fetch response received:', response);

      if (timeoutId) {
        clearTimeout(timeoutId);
        console.log('Timeout cleared:', requestId);
      }

      updateProgress(50);
      console.log('Stream progress updated to 50');

      if (!response.ok) {
        console.log('Response not OK:', response.status, response.statusText);
        const errorCategory = this.getErrorCategory(response.status);
        const error = new Error(`HTTP error! status: ${response.status}`);
        this.notificationService.addErrorNotification({
          category: errorCategory,
          message: `API Request Failed: ${response.statusText}`,
          context: {
            toolName: 'browser_action',
            parameters: {
              url: config.url,
              method: config.method,
              status: response.status.toString()
            },
            timestamp: Date.now(),
            retryCount: 0
          },
          suggestions: [{
            toolName: 'browser_action',
            suggestedParameters: {
              url: config.url,
              method: config.method,
              timeout: ((config.timeout || 30000) + 10000).toString()
            },
            confidence: 0.8,
            reasoning: 'Increasing timeout might help if the error was due to slow response'
          }]
        });
        throw error;
      }

      let data: T;
      if (config.streamResponse && response.body) {
        data = await this.handleStreamResponse(response.body, requestId);
      } else {
        data = await response.json();
      }

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      console.log('Headers:', headers);

      // Track token usage if available in response headers
      const inputTokens = parseInt(headers['x-input-tokens'] || '0');
      const outputTokens = parseInt(headers['x-output-tokens'] || '0');
      if (inputTokens || outputTokens) {
        console.log('Tracking token usage:', inputTokens, outputTokens, requestId);
        this.tokenTracker.trackUsage(inputTokens, outputTokens, requestId);
      }

      updateProgress(100);
      console.log('Stream progress updated to 100');
      this.streamController.stop();
      console.log('StreamController stopped');
      
      this.metrics.completeRequest(requestId, true);
      console.log('Request completed successfully:', requestId);

      return {
        data,
        status: response.status,
        headers: config.method === 'GET' ? {} : headers, // Return empty headers for GET requests
        requestId
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error caught in performRequest:', error);
      this.streamController.error(error instanceof Error ? error : new Error(errorMessage));
      this.metrics.completeRequest(requestId, false, errorMessage);
      console.error('Request completed with error:', requestId, errorMessage);
      
      // Add error notification if it's not already a handled HTTP error
      if (!(error instanceof Error && error.message.startsWith('HTTP error!'))) {
        this.notificationService.addErrorNotification({
          category: ErrorCategory.UNKNOWN,
          message: `API Request Failed: ${errorMessage}`,
          context: {
            toolName: 'browser_action',
            parameters: {
              url: config.url,
              method: config.method
            },
            timestamp: Date.now(),
            retryCount: 0
          },
          suggestions: []
        });
      }
      
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

  private getErrorCategory(status: number): ErrorCategory {
    if (status === 401 || status === 403) {
      return ErrorCategory.PERMISSION_DENIED;
    }
    if (status === 404) {
      return ErrorCategory.RESOURCE_NOT_FOUND;
    }
    if (status === 408 || status === 504) {
      return ErrorCategory.TIMEOUT;
    }
    if (status === 400) {
      return ErrorCategory.INVALID_PARAMETER;
    }
    return ErrorCategory.UNKNOWN;
  }
}
