import { RetryStrategy } from '../types/ToolCallOptimization';

export interface RetryStrategy {
  maxAttempts: number;
  delayMs?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryConfig extends RetryStrategy {
  maxRetries?: number; // Add optional maxRetries for backwards compatibility
  // No additional properties needed
}

export interface RetryHistory {
  attempts: number;
  lastError?: Error;
  lastAttemptTime?: number;
}

export class ToolCallRetryService {
  private retryHistory = new Map<string, RetryHistory>();

  constructor() {}

  public async executeWithRetry<T>(
    toolId: string,
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    // Use maxRetries if provided, otherwise use maxAttempts
    const maxAttempts = config.maxRetries !== undefined 
      ? config.maxRetries + 1 
      : config.maxAttempts;
    
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < maxAttempts) {
      try {
        const result = await operation();
        this.updateRetryHistory(toolId, attempts, undefined);
        return result;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error(String(error));

        if (config.shouldRetry && !config.shouldRetry(lastError)) {
          this.updateRetryHistory(toolId, attempts, lastError);
          throw lastError;
        }

        if (attempts === maxAttempts) {
          this.updateRetryHistory(toolId, attempts, lastError);
          throw lastError;
        }

        await new Promise(resolve => setTimeout(resolve, config.delayMs || 1000));
      }
    }

    throw new Error('Maximum retry attempts reached');
  }

  public getRetryHistory(toolId: string): RetryHistory | undefined {
    return this.retryHistory.get(toolId);
  }

  public clearRetryHistory(toolId: string): void {
    this.retryHistory.delete(toolId);
  }

  public clearHistory(): void {
    this.retryHistory.clear();
  }

  private updateRetryHistory(toolId: string, attempts: number, lastError?: Error): void {
    this.retryHistory.set(toolId, {
      attempts,
      lastError,
      lastAttemptTime: Date.now()
    });
  }
}
