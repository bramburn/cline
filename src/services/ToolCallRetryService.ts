export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error) => boolean;
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
    let attempts = 0;
    let lastError: Error | undefined;

    while (attempts < config.maxRetries) {
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

        if (attempts === config.maxRetries) {
          this.updateRetryHistory(toolId, attempts, lastError);
          throw lastError;
        }

        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
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
