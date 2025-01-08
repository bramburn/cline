import { ToolUseName } from '../../core/assistant-message';

export interface ToolCallPattern {
  toolName: ToolUseName;
  parameters: Record<string, any>;
  outcome: ToolCallOutcome;
  timestamp: number;
  retryCount: number;
  errorType?: ErrorCategory;
}

export interface ToolCallOutcome {
  success: boolean;
  duration: number;
  errorMessage?: string;
}

export enum ErrorCategory {
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface IToolCallPatternAnalyzer {
  recordToolCall(pattern: ToolCallPattern): void;
  getToolCallHistory(toolName?: ToolUseName): ToolCallPattern[];
  analyzeToolCallPatterns(toolName?: ToolUseName): PatternAnalysis;
}

export interface PatternAnalysis {
  successRate: number;
  averageDuration: number;
  commonErrors: Array<{
    category: ErrorCategory;
    count: number;
  }>;
  suggestions: ToolCallSuggestion[];
  successfulPatterns: string[];
}

export interface ToolCallSuggestion {
  toolName: ToolUseName;
  suggestedParameters: Record<string, string>;
  confidence: number;
  reasoning: string;
} 