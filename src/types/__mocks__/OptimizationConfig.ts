export interface OptimizationConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error) => boolean;
  modifyParameters?: (parameters: Record<string, any>, error: Error) => Record<string, any>;
}

export const createMockOptimizationConfig = (overrides: Partial<OptimizationConfig> = {}): OptimizationConfig => ({
  maxRetries: 3,
  retryDelay: 1000,
  shouldRetry: () => true,
  modifyParameters: (params) => params,
  ...overrides
});
