// Removed conflicting ToolCallPattern interface

export interface OptimizationConfig {
  maxRetries: number;
  retryDelay: number;
  shouldRetry?: (error: Error) => boolean;
  modifyParameters?: (parameters: Record<string, any>, error: Error) => Record<string, any>;
}

import { ErrorReport } from '../types/ToolCallOptimization';

import { ToolCallPattern, ToolCallOutcome } from '../types';
import { ToolCallRetryService } from './ToolCallRetryService';
import { ToolCallPatternAnalyzer } from './ToolCallPatternAnalyzer';
import { ToolCallErrorReporter } from './ToolCallErrorReporter';
import { ToolCallSuggestionGenerator } from './ToolCallSuggestionGenerator';
import { ErrorCategory } from '../types/ToolCallOptimization';

export class ToolCallOptimizationAgent {
  private patterns: ToolCallPattern[] = [];
  private toolConfigs = new Map<string, OptimizationConfig>();
  private retryService: ToolCallRetryService;
  private patternAnalyzer: ToolCallPatternAnalyzer;
  private errorReporter: ToolCallErrorReporter;
  private suggestionGenerator: ToolCallSuggestionGenerator;

  constructor() {
    this.retryService = new ToolCallRetryService();
    this.patternAnalyzer = new ToolCallPatternAnalyzer();
    this.errorReporter = new ToolCallErrorReporter();
    this.suggestionGenerator = new ToolCallSuggestionGenerator();
    this.initializeDefaultConfigs();
  }

  private initializeDefaultConfigs(): void {
    const defaultConfig: OptimizationConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      shouldRetry: (error: Error) => true,
      modifyParameters: (parameters: Record<string, any>, error: Error) => ({ ...parameters })
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
        console.log(`Tool call ${toolId} executed successfully with result:`, result);
this.recordPattern({
  toolName: toolId as 'browser_action' | 'execute_command' | 'read_file' | 'write_to_file' | 'replace_in_file' | 'search_files' | 'list_files' | 'list_code_definition_names' | 'use_mcp_tool' | 'access_mcp_resource' | 'ask_followup_question' | 'attempt_completion',
  parameters,
  outcome: {
    success: true,
    duration: Date.now() - startTime
  } as ToolCallOutcome,
  timestamp: new Date(),
  retryCount: attempts
});
        return result;
      } catch (error) {
        attempts++;
        lastError = error instanceof Error ? error : new Error(String(error));

        console.log(`Tool call ${toolId} failed with error:`, lastError);
this.recordPattern({
  toolName: toolId as 'browser_action' | 'execute_command' | 'read_file' | 'write_to_file' | 'replace_in_file' | 'search_files' | 'list_files' | 'list_code_definition_names' | 'use_mcp_tool' | 'access_mcp_resource' | 'ask_followup_question' | 'attempt_completion',
  parameters,
  outcome: {
    success: false,
    error: lastError,
    duration: Date.now() - startTime
  } as ToolCallOutcome,
  timestamp: new Date(),
  retryCount: attempts,
  errorType: lastError.message.includes('regex') ? 'regex' as ErrorCategory : lastError.message.includes('timeout') ? 'timeout' as ErrorCategory : undefined
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
    console.log('Current patterns:', this.patterns);
    return [...this.patterns];
  }

  public getRetryHistory(): ToolCallPattern[] {
    return this.patterns.filter(p => !p.outcome.success);
  }

  public clearHistory(): void {
    this.patterns = [];
    this.retryService.clearHistory();
    this.patternAnalyzer.clearAnalysis();
    this.errorReporter.clearHistory();
  }

  public getPatternAnalysis(): Record<string, { successRate: number; successfulPatterns: string[] }> {
    const analysis: Record<string, { successRate: number; successfulPatterns: string[] }> = {};
    
    this.patterns.forEach(pattern => {
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

    // Calculate success rates
    for (const toolId in analysis) {
      const totalAttempts = this.patterns.filter(p => p.toolId === toolId).length;
      const successfulAttempts = analysis[toolId].successfulPatterns.length;
      analysis[toolId].successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;
    }

    return analysis;
  }

  public getErrorHistory(): Array<{ error: { message: string }; timestamp: number }> {
    return this.errorReporter.getHistory();
  }

  public getSuggestions(): string[] {
    return this.suggestionGenerator.getSuggestions();
  }

  private recordPattern(pattern: ToolCallPattern): void {
    this.patterns.push(pattern);
  }
}
