import { vi } from 'vitest';
import { ToolCallPattern } from '../../types/__mocks__/ToolCallPattern';
import { OptimizationConfig } from '../../types/__mocks__/OptimizationConfig';

export class ToolCallOptimizationAgent {
  private _patterns: ToolCallPattern[] = [];
  private _toolConfigs = new Map<string, OptimizationConfig>();
  private _errorHistory: Array<{ error: { message: string }; timestamp: number }> = [];

  executeToolCall = vi.fn().mockImplementation(async (toolId, parameters, operation) => {
    try {
      const result = await operation(parameters);
      this._patterns.push({
        toolId,
        toolName: toolId,
        parameters,
        outcome: {
          success: true,
          duration: 100
        },
        timestamp: Date.now()
      });
      return result;
    } catch (error) {
      this._errorHistory.push({
        error: { message: error instanceof Error ? error.message : String(error) },
        timestamp: Date.now()
      });
      throw error;
    }
  });

  setToolConfig = vi.fn().mockImplementation((toolId, config) => {
    this._toolConfigs.set(toolId, config);
  });

  getToolConfig = vi.fn().mockImplementation((toolId) => {
    return this._toolConfigs.get(toolId) || {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: () => true,
      modifyParameters: (params) => params
    });
  });

  getPatterns = vi.fn().mockImplementation(() => [...this._patterns]);

  getRetryHistory = vi.fn().mockImplementation(() => 
    this._patterns.filter(p => !p.outcome.success)
  );

  clearHistory = vi.fn().mockImplementation(() => {
    this._patterns = [];
    this._errorHistory = [];
  });

  getPatternAnalysis = vi.fn().mockImplementation(() => {
    const analysis: Record<string, { successRate: number; successfulPatterns: string[] }> = {};
    
    this._patterns.forEach(pattern => {
      if (!analysis[pattern.toolId]) {
        analysis[pattern.toolId] = {
          successRate: 0,
          successfulPatterns: []
        };
      }
      
      if (pattern.outcome.success) {
        analysis[pattern.toolId].successfulPatterns.push(JSON.stringify(pattern.parameters));
      }
    });

    for (const toolId in analysis) {
      const totalAttempts = this._patterns.filter(p => p.toolId === toolId).length;
      const successfulAttempts = analysis[toolId].successfulPatterns.length;
      analysis[toolId].successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;
    }

    return analysis;
  });

  getErrorHistory = vi.fn().mockImplementation(() => [...this._errorHistory]);

  getSuggestions = vi.fn().mockReturnValue([
    'Consider using proper regex patterns',
    'Consider increasing timeout duration'
  ]);
}

// Factory function for creating a mock instance
export const createMockToolCallOptimizationAgent = () => {
  return new ToolCallOptimizationAgent();
}; 