import { ToolUseName } from '../core/assistant-message';
import { 
  ErrorCategory, 
  PatternAnalysis, 
  ToolCallPattern, 
  ToolCallSuggestion 
} from '../types/ToolCallOptimization';

export class ToolCallPatternAnalyzer {
  private patterns: ToolCallPattern[] = [];
  private readonly ANALYSIS_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

  public addPattern(pattern: ToolCallPattern): void {
    this.patterns.push(pattern);
    this.pruneOldPatterns();
  }

  public addPatterns(patterns: ToolCallPattern[]): void {
    this.patterns.push(...patterns);
    this.pruneOldPatterns();
  }

  private pruneOldPatterns(): void {
    const cutoffTime = Date.now() - this.ANALYSIS_WINDOW_MS;
    this.patterns = this.patterns.filter(p => p.timestamp >= cutoffTime);
  }

  public analyzePatterns(toolName: ToolUseName): PatternAnalysis {
    const toolPatterns = this.patterns.filter(p => p.toolName === toolName);
    
    if (toolPatterns.length === 0) {
      return this.getEmptyAnalysis();
    }

    const successfulPatterns = toolPatterns.filter(p => p.outcome.success);
    const successRate = successfulPatterns.length / toolPatterns.length;
    
    const averageDuration = toolPatterns.reduce(
      (sum, p) => sum + p.outcome.duration, 
      0
    ) / toolPatterns.length;

    const commonErrors = this.analyzeCommonErrors(toolPatterns);
    const suggestions = this.generateSuggestions(toolPatterns);

    return {
      successRate,
      averageDuration,
      commonErrors,
      suggestions
    };
  }

  private analyzeCommonErrors(patterns: ToolCallPattern[]): Array<{
    category: ErrorCategory;
    count: number;
  }> {
    const errorCounts = new Map<ErrorCategory, number>();

    patterns
      .filter(p => !p.outcome.success && p.errorType)
      .forEach(p => {
        const currentCount = errorCounts.get(p.errorType!) || 0;
        errorCounts.set(p.errorType!, currentCount + 1);
      });

    return Array.from(errorCounts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }

  private generateSuggestions(patterns: ToolCallPattern[]): ToolCallSuggestion[] {
    const suggestions: ToolCallSuggestion[] = [];
    const successfulParams = patterns
      .filter(p => p.outcome.success)
      .map(p => p.parameters);

    if (successfulParams.length === 0) {
      return [];
    }

    // Find most common successful parameter patterns
    const paramPatterns = this.findCommonParameterPatterns(successfulParams);
    
    // Generate suggestions based on common successful patterns
    paramPatterns.forEach(pattern => {
      const successRate = this.calculateParameterPatternSuccessRate(pattern, patterns);
      
      if (successRate > 0.7) { // Only suggest patterns with high success rate
        suggestions.push({
          toolName: patterns[0].toolName,
          suggestedParameters: pattern,
          confidence: successRate,
          reasoning: this.generateReasoning(pattern, patterns)
        });
      }
    });

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private findCommonParameterPatterns(params: Record<string, string>[]): Record<string, string>[] {
    const patterns = new Map<string, { pattern: Record<string, string>; count: number }>();

    params.forEach(param => {
      const key = JSON.stringify(param);
      const existing = patterns.get(key);
      if (existing) {
        existing.count++;
      } else {
        patterns.set(key, { pattern: param, count: 1 });
      }
    });

    return Array.from(patterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3) // Keep top 3 patterns
      .map(p => p.pattern);
  }

  private calculateParameterPatternSuccessRate(
    pattern: Record<string, string>,
    patterns: ToolCallPattern[]
  ): number {
    const matchingPatterns = patterns.filter(p => 
      Object.entries(pattern).every(([key, value]) => p.parameters[key] === value)
    );

    if (matchingPatterns.length === 0) {
      return 0;
    }

    const successfulMatches = matchingPatterns.filter(p => p.outcome.success);
    return successfulMatches.length / matchingPatterns.length;
  }

  private generateReasoning(
    pattern: Record<string, string>,
    patterns: ToolCallPattern[]
  ): string {
    const successRate = this.calculateParameterPatternSuccessRate(pattern, patterns);
    const totalUses = patterns.filter(p => 
      Object.entries(pattern).every(([key, value]) => p.parameters[key] === value)
    ).length;

    return `This parameter combination has a ${(successRate * 100).toFixed(1)}% success rate ` +
           `over ${totalUses} uses. ${this.getParameterSpecificReasoning(pattern)}`;
  }

  private getParameterSpecificReasoning(pattern: Record<string, string>): string {
    const reasons: string[] = [];

    Object.entries(pattern).forEach(([key, value]) => {
      switch (key) {
        case 'path':
          if (value.startsWith('./')) {
            reasons.push('Uses relative path which is generally safer');
          }
          break;
        case 'regex':
          if (value.includes('\\')) {
            reasons.push('Uses properly escaped regex pattern');
          }
          break;
        case 'recursive':
          if (value === 'true') {
            reasons.push('Includes subdirectories in search');
          }
          break;
      }
    });

    return reasons.length > 0 ? 'Notably: ' + reasons.join('. ') : '';
  }

  private getEmptyAnalysis(): PatternAnalysis {
    return {
      successRate: 0,
      averageDuration: 0,
      commonErrors: [],
      suggestions: []
    };
  }

  public clearPatterns(): void {
    this.patterns = [];
  }
} 