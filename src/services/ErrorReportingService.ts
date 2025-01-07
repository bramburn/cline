import { ToolUseName } from '../core/assistant-message';
import { 
  ErrorCategory, 
  ErrorReport, 
  ToolCallPattern, 
  ToolCallSuggestion 
} from '../types/ToolCallOptimization';
import { ToolCallPatternAnalyzer } from './ToolCallPatternAnalyzer';

export class ErrorReportingService {
  private readonly patternAnalyzer: ToolCallPatternAnalyzer;
  private readonly errorHistory: ErrorReport[] = [];

  constructor(patternAnalyzer: ToolCallPatternAnalyzer) {
    this.patternAnalyzer = patternAnalyzer;
  }

  public generateErrorReport(
    error: Error,
    toolName: ToolUseName,
    parameters: Record<string, string>,
    pattern: ToolCallPattern
  ): ErrorReport {
    const category = this.categorizeError(error);
    const report: ErrorReport = {
      category,
      message: this.formatErrorMessage(error, category),
      context: {
        toolName,
        parameters,
        timestamp: Date.now(),
        retryCount: pattern.retryCount
      },
      suggestions: this.generateSuggestions(category, toolName, parameters)
    };

    this.errorHistory.push(report);
    return report;
  }

  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid') || message.includes('malformed')) {
      return ErrorCategory.INVALID_PARAMETER;
    }
    if (message.includes('missing') || message.includes('required')) {
      return ErrorCategory.MISSING_PARAMETER;
    }
    if (message.includes('permission') || message.includes('access denied')) {
      return ErrorCategory.PERMISSION_DENIED;
    }
    if (message.includes('not found') || message.includes('no such')) {
      return ErrorCategory.RESOURCE_NOT_FOUND;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return ErrorCategory.TIMEOUT;
    }
    
    return ErrorCategory.UNKNOWN;
  }

  private formatErrorMessage(error: Error, category: ErrorCategory): string {
    let message = `${error.message}\n\n`;

    switch (category) {
      case ErrorCategory.INVALID_PARAMETER:
        message += 'The provided parameter format is invalid. Please check the parameter requirements.';
        break;
      case ErrorCategory.MISSING_PARAMETER:
        message += 'A required parameter is missing. Please ensure all required parameters are provided.';
        break;
      case ErrorCategory.PERMISSION_DENIED:
        message += 'The operation was denied due to insufficient permissions.';
        break;
      case ErrorCategory.RESOURCE_NOT_FOUND:
        message += 'The requested resource could not be found. Please verify the resource exists.';
        break;
      case ErrorCategory.TIMEOUT:
        message += 'The operation timed out. This might be temporary, consider retrying.';
        break;
      case ErrorCategory.UNKNOWN:
        message += 'An unexpected error occurred.';
        break;
    }

    return message;
  }

  private generateSuggestions(
    category: ErrorCategory,
    toolName: ToolUseName,
    parameters: Record<string, string>
  ): ToolCallSuggestion[] {
    const suggestions: ToolCallSuggestion[] = [];
    const analysis = this.patternAnalyzer.analyzePatterns(toolName);

    // Add suggestions from pattern analysis
    suggestions.push(...analysis.suggestions);

    // Add category-specific suggestions
    switch (category) {
      case ErrorCategory.INVALID_PARAMETER:
        suggestions.push(...this.getInvalidParameterSuggestions(toolName, parameters));
        break;
      case ErrorCategory.MISSING_PARAMETER:
        suggestions.push(...this.getMissingParameterSuggestions(toolName, parameters));
        break;
      case ErrorCategory.RESOURCE_NOT_FOUND:
        suggestions.push(...this.getResourceNotFoundSuggestions(toolName, parameters));
        break;
    }

    return suggestions;
  }

  private getInvalidParameterSuggestions(
    toolName: ToolUseName,
    parameters: Record<string, string>
  ): ToolCallSuggestion[] {
    const suggestions: ToolCallSuggestion[] = [];

    if (parameters.regex) {
      suggestions.push({
        toolName,
        suggestedParameters: {
          ...parameters,
          regex: parameters.regex.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        },
        confidence: 0.8,
        reasoning: 'Escaped special regex characters to prevent syntax errors'
      });
    }

    if (parameters.path) {
      suggestions.push({
        toolName,
        suggestedParameters: {
          ...parameters,
          path: parameters.path.replace(/\\/g, '/')
        },
        confidence: 0.9,
        reasoning: 'Normalized path separators to forward slashes'
      });
    }

    return suggestions;
  }

  private getMissingParameterSuggestions(
    toolName: ToolUseName,
    parameters: Record<string, string>
  ): ToolCallSuggestion[] {
    const suggestions: ToolCallSuggestion[] = [];
    const requiredParams = this.getRequiredParameters(toolName);
    const missingParams = requiredParams.filter(param => !parameters[param]);

    if (missingParams.length > 0) {
      const suggestedParams = { ...parameters };
      missingParams.forEach(param => {
        suggestedParams[param] = this.getDefaultValueForParameter(param);
      });

      suggestions.push({
        toolName,
        suggestedParameters: suggestedParams,
        confidence: 0.7,
        reasoning: `Added missing required parameters: ${missingParams.join(', ')}`
      });
    }

    return suggestions;
  }

  private getResourceNotFoundSuggestions(
    toolName: ToolUseName,
    parameters: Record<string, string>
  ): ToolCallSuggestion[] {
    const suggestions: ToolCallSuggestion[] = [];

    if (parameters.path) {
      // Try parent directory
      const pathParts = parameters.path.split('/');
      if (pathParts.length > 1) {
        suggestions.push({
          toolName,
          suggestedParameters: {
            ...parameters,
            path: pathParts.slice(0, -1).join('/')
          },
          confidence: 0.6,
          reasoning: 'Try searching in the parent directory'
        });
      }

      // Add recursive search suggestion
      if (toolName === 'list_files' && !parameters.recursive) {
        suggestions.push({
          toolName,
          suggestedParameters: {
            ...parameters,
            recursive: 'true'
          },
          confidence: 0.7,
          reasoning: 'Enable recursive search to look in subdirectories'
        });
      }
    }

    return suggestions;
  }

  private getRequiredParameters(toolName: ToolUseName): string[] {
    switch (toolName) {
      case 'read_file':
      case 'list_files':
      case 'list_code_definition_names':
        return ['path'];
      case 'write_to_file':
        return ['path', 'content'];
      case 'search_files':
        return ['path', 'regex'];
      case 'execute_command':
        return ['command'];
      default:
        return [];
    }
  }

  private getDefaultValueForParameter(param: string): string {
    switch (param) {
      case 'path':
        return './';
      case 'recursive':
        return 'false';
      case 'regex':
        return '.*';
      default:
        return '';
    }
  }

  public getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory];
  }

  public clearHistory(): void {
    this.errorHistory = [];
  }
} 