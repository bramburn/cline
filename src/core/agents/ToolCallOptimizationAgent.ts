import { ToolUseName } from '../assistant-message';
import { ErrorReport, PatternAnalysis, ToolCallPattern } from '../../types/ToolCallOptimization';
import { ToolCallRetryService } from '../../services/ToolCallRetryService';
import { ToolCallPatternAnalyzer } from '../../services/ToolCallPatternAnalyzer';
import { ErrorReportingService } from '../../services/ErrorReportingService';

export class ToolCallOptimizationAgent {
  private readonly retryService: ToolCallRetryService;
  private readonly patternAnalyzer: ToolCallPatternAnalyzer;
  private readonly errorReporter: ErrorReportingService;

  constructor() {
    this.patternAnalyzer = new ToolCallPatternAnalyzer();
    this.retryService = new ToolCallRetryService();
    this.errorReporter = new ErrorReportingService(this.patternAnalyzer);
  }

  public async executeToolCall<T>(
    toolName: ToolUseName,
    parameters: Record<string, string>,
    execute: (params: Record<string, string>) => Promise<T>
  ): Promise<{
    result: T;
    pattern?: ToolCallPattern;
    error?: ErrorReport;
    analysis?: PatternAnalysis;
  }> {
    try {
      // Execute tool call with retry logic
      const result = await this.retryService.executeWithRetry(
        toolName,
        () => execute(parameters),
        { 
          maxAttempts: 3, 
          delayMs: 1000, 
          shouldRetry: (error) => {
            // Add custom retry logic if needed
            return error.message.includes('TIMEOUT') || error.message.includes('NETWORK_ERROR');
          }
        }
      );

      // Get pattern history for analysis
      const retryHistory = this.retryService.getRetryHistory(toolName);
      const latestPattern = retryHistory ? {
        toolName,
        parameters,
        attempts: retryHistory.attempts,
        lastError: retryHistory.lastError
      } : undefined;

      // Update pattern analyzer
      if (latestPattern) {
        this.patternAnalyzer.addPattern(latestPattern);
      }

      // Analyze patterns for this tool
      const analysis = this.patternAnalyzer.analyzePatterns(toolName);

      return {
        result,
        pattern: latestPattern,
        analysis
      };
    } catch (error) {
      // Get pattern history for error reporting
      const retryHistory = this.retryService.getRetryHistory(toolName);
      const failedPattern = retryHistory ? {
        toolName,
        parameters,
        attempts: retryHistory.attempts,
        lastError: retryHistory.lastError || error as Error
      } : {
        toolName,
        parameters,
        attempts: 1,
        lastError: error as Error
      };

      // Generate error report
      const errorReport = this.errorReporter.generateErrorReport(
        error as Error,
        toolName,
        parameters,
        failedPattern
      );

      // Update pattern analyzer with failed attempt
      this.patternAnalyzer.addPattern(failedPattern);

      // Analyze patterns including the failure
      const analysis = this.patternAnalyzer.analyzePatterns(toolName);

      return {
        result: null as T,
        pattern: failedPattern,
        error: errorReport,
        analysis
      };
    }
  }

  public getPatternAnalysis(toolName: ToolUseName): PatternAnalysis {
    return this.patternAnalyzer.analyzePatterns(toolName);
  }

  public getErrorHistory(): ErrorReport[] {
    return this.errorReporter.getErrorHistory();
  }

  public clearHistory(): void {
    this.retryService.clearHistory();
    this.patternAnalyzer.clearPatterns();
    this.errorReporter.clearHistory();
  }
}