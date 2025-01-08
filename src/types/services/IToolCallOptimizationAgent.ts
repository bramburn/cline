import { ToolUseName } from '../../core/assistant-message';
import { ToolCallPattern, ErrorCategory, ToolCallSuggestion } from './IToolCallPatternAnalyzer';

export interface OptimizationStrategy {
  maxAttempts: number;
  delayMs: number;
  shouldRetry: (error: Error) => boolean;
  modifyParameters: (params: Record<string, string>, error: Error) => Record<string, string>;
}

export interface IToolCallOptimizationAgent {
  optimizeToolCall(
    toolName: ToolUseName, 
    parameters: Record<string, string>, 
    error?: Error
  ): ToolCallSuggestion[];

  applyOptimizationStrategy(
    toolName: ToolUseName, 
    parameters: Record<string, string>, 
    strategy: OptimizationStrategy
  ): Record<string, string>;

  generateErrorSuggestions(
    toolName: ToolUseName, 
    parameters: Record<string, string>, 
    errorCategory: ErrorCategory
  ): ToolCallSuggestion[];

  analyzeToolCallHistory(toolName?: ToolUseName): ToolCallPattern[];
} 