export interface ToolCallPattern {
  toolId: string;
  parameters: Record<string, any>;
  outcome: {
    success: boolean;
    error?: Error;
    duration: number;
  };
  timestamp: number;
}

export interface OptimizationConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error) => boolean;
  modifyParameters?: (parameters: Record<string, any>, error: Error) => Record<string, any>;
}

export class ToolCallOptimizationAgent {
  private patterns: ToolCallPattern[] = [];
  private toolConfigs = new Map<string, OptimizationConfig>();

  constructor() {
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    const defaultConfig: OptimizationConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: (error: Error) => true,
      modifyParameters: (parameters: Record<string, any>) => ({ ...parameters })
    };

    this.toolConfigs.set('default', defaultConfig);
  }

  public async executeToolCall<T>(
    toolId: string,
    parameters: Record<string, any>,
    operation: (params: Record<string, any>) => Promise<T>
  ): Promise<T> {
    const config = this.toolConfigs.get(toolId) || this.toolConfigs.get('default')!;
    let attempts = 0;
    let lastError: Error | undefined;
    const startTime = Date.now();

    while (attempts < config.maxRetries) {
      try {
        const result = await operation(parameters);
        this.recordPattern({
          toolId,
          parameters,
          outcome: {
            success: true,
            duration: Date.now() - startTime
          },
          timestamp: Date.now()
        });
        return result;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error(String(error));

        this.recordPattern({
          toolId,
          parameters,
          outcome: {
            success: false,
            error: lastError,
            duration: Date.now() - startTime
          },
          timestamp: Date.now()
        });

        if (config.shouldRetry && !config.shouldRetry(lastError)) {
          throw lastError;
        }

        if (attempts === config.maxRetries) {
          throw lastError;
        }

        if (config.modifyParameters) {
          parameters = config.modifyParameters(parameters, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
      }
    }

    throw new Error('Maximum retry attempts reached');
  }

  public setToolConfig(toolId: string, config: OptimizationConfig): void {
    this.toolConfigs.set(toolId, {
      ...this.toolConfigs.get('default')!,
      ...config
    });
  }

  public getToolConfig(toolId: string): OptimizationConfig {
    return this.toolConfigs.get(toolId) || this.toolConfigs.get('default')!;
  }

  public getPatterns(): ToolCallPattern[] {
    return [...this.patterns];
  }

  public clearPatterns(): void {
    this.patterns = [];
  }

  private recordPattern(pattern: ToolCallPattern): void {
    this.patterns.push(pattern);
  }
} 