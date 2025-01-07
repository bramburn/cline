import { ToolUseName } from '../core/assistant-message';

export enum ErrorCategory {
  INVALID_PARAMETER = 'INVALID_PARAMETER',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export interface ErrorContext {
  toolName: ToolUseName;
  parameters: Record<string, string>;
  timestamp: number;
  retryCount: number;
}

export interface ErrorSuggestion {
  toolName: ToolUseName;
  suggestedParameters: Record<string, string>;
  confidence: number;
  reasoning: string;
}

export interface ErrorReport {
  category: ErrorCategory;
  message: string;
  context: ErrorContext;
  suggestions: ErrorSuggestion[];
}

export interface ErrorReportingConfig {
  maxHistorySize: number;
  suggestionConfidenceThreshold: number;
} 