import { ToolUseName } from '../core/assistant-message';
import { ErrorCategory, RetryStrategy, ToolCallPattern } from '../types/ToolCallOptimization';
import delay from 'delay';

export class ToolCallRetryService {
  private retryStrategies: Map<ToolUseName, RetryStrategy> = new Map();
  private retryHistory: ToolCallPattern[] = [];

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies() {
    const defaultStrategy: RetryStrategy = {
      maxAttempts: 3,
      delayMs: 1000,
      shouldRetry: (error: Error) => {
        // Don't retry on invalid parameters or missing parameters
        return !error.message.includes('INVALID_PARAMETER') && 
               !error.message.includes('MISSING_PARAMETER');
      },
      modifyParameters: (params: Record<string, string>, error: Error) => {
        return { ...params }; // Default strategy doesn't modify parameters
      }
    };

    // Tool-specific strategies
    const readFileStrategy: RetryStrategy = {
      ...defaultStrategy,
      modifyParameters: (params: Record<string, string>, error: Error) => {
        if (error.message.includes('RESOURCE_NOT_FOUND')) {
          // Try parent directory if file not found
          const path = params.path;
          if (path && path.includes('/')) {
            return {
              ...params,
              path: path.split('/').slice(0, -1).join('/')
            };
          }
        }
        return params;
      }
    };

    const searchFilesStrategy: RetryStrategy = {
      ...defaultStrategy,
      modifyParameters: (params: Record<string, string>, error: Error) => {
        if (error.message.includes('INVALID_PARAMETER') && params.regex) {
          // Escape special characters in regex
          return {
            ...params,
            regex: params.regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          };
        }
        return params;
      }
    };

    // Register strategies
    this.retryStrategies.set('read_file', readFileStrategy);
    this.retryStrategies.set('search_files', searchFilesStrategy);
    this.retryStrategies.set('list_files', defaultStrategy);
    this.retryStrategies.set('list_code_definition_names', defaultStrategy);
    this.retryStrategies.set('write_to_file', defaultStrategy);
    this.retryStrategies.set('execute_command', defaultStrategy);
  }

  public async executeWithRetry<T>(
    toolName: ToolUseName,
    parameters: Record<string, string>,
    execute: (params: Record<string, string>) => Promise<T>
  ): Promise<T> {
    const strategy = this.retryStrategies.get(toolName) || this.getDefaultStrategy();
    let lastError: Error;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt < strategy.maxAttempts) {
      try {
        const result = await execute(parameters);
        this.recordAttempt(toolName, parameters, {
          success: true,
          duration: Date.now() - startTime
        });
        return result;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        this.recordAttempt(toolName, parameters, {
          success: false,
          duration: Date.now() - startTime,
          errorMessage: lastError.message
        });

        if (attempt < strategy.maxAttempts && strategy.shouldRetry(lastError)) {
          parameters = strategy.modifyParameters(parameters, lastError);
          await delay(strategy.delayMs);
          continue;
        }
        break;
      }
    }

    throw lastError!;
  }

  private recordAttempt(
    toolName: ToolUseName,
    parameters: Record<string, string>,
    outcome: { success: boolean; duration: number; errorMessage?: string }
  ) {
    const pattern: ToolCallPattern = {
      toolName,
      parameters,
      outcome,
      timestamp: Date.now(),
      retryCount: this.retryHistory.filter(p => p.toolName === toolName).length,
      errorType: outcome.errorMessage ? this.categorizeError(outcome.errorMessage) : undefined
    };
    this.retryHistory.push(pattern);
  }

  private categorizeError(errorMessage: string): ErrorCategory {
    if (errorMessage.includes('INVALID_PARAMETER')) return ErrorCategory.INVALID_PARAMETER;
    if (errorMessage.includes('MISSING_PARAMETER')) return ErrorCategory.MISSING_PARAMETER;
    if (errorMessage.includes('PERMISSION_DENIED')) return ErrorCategory.PERMISSION_DENIED;
    if (errorMessage.includes('RESOURCE_NOT_FOUND')) return ErrorCategory.RESOURCE_NOT_FOUND;
    if (errorMessage.includes('TIMEOUT')) return ErrorCategory.TIMEOUT;
    return ErrorCategory.UNKNOWN;
  }

  private getDefaultStrategy(): RetryStrategy {
    return {
      maxAttempts: 3,
      delayMs: 1000,
      shouldRetry: () => true,
      modifyParameters: params => params
    };
  }

  public getRetryHistory(): ToolCallPattern[] {
    return [...this.retryHistory];
  }

  public clearHistory(): void {
    this.retryHistory = [];
  }
} 