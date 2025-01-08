import { vi } from 'vitest';
import { ToolCallPattern } from '../../types/__mocks__/ToolCallPattern';
import { ErrorCategory } from '../../types/__mocks__/ErrorCategory';

export class ToolCallPatternAnalyzer {
  private _patterns: ToolCallPattern[] = [];

  recordToolCall = vi.fn().mockImplementation((pattern: ToolCallPattern) => {
    this._patterns.push(pattern);
  });

  getToolCallHistory = vi.fn().mockImplementation(() => [...this._patterns]);

  analyzeToolCallPatterns = vi.fn().mockImplementation(() => ({
    successRate: this._patterns.filter(p => p.outcome.success).length / this._patterns.length,
    averageDuration: this._patterns.reduce((sum, p) => sum + p.outcome.duration, 0) / this._patterns.length,
    commonErrors: [
      { category: ErrorCategory.RESOURCE_NOT_FOUND, count: 2 },
      { category: ErrorCategory.TIMEOUT, count: 1 }
    ],
    suggestions: [],
    successfulPatterns: this._patterns
      .filter(p => p.outcome.success)
      .map(p => JSON.stringify(p.parameters))
  }));

  clearAnalysis = vi.fn().mockImplementation(() => {
    this._patterns = [];
  });
}
