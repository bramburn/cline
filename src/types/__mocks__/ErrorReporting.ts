export enum ErrorCategory {
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
  INVALID_PARAMETER = 'INVALID_PARAMETER'
}

export interface ErrorNotification {
  category: ErrorCategory;
  message: string;
  context: {
    toolName: string;
    parameters: Record<string, string>;
    timestamp: number;
    retryCount: number;
  };
  suggestions: Array<{
    toolName: string;
    suggestedParameters: Record<string, string>;
    confidence: number;
    reasoning: string;
  }>;
}
