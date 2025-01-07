import { ToolCallPattern } from './ToolCallOptimizationAgent';

export class ToolCallSuggestionGenerator {
  private patterns: ToolCallPattern[] = [];

  public getSuggestions(): string[] {
    const suggestions = new Set<string>();

    this.patterns.forEach(pattern => {
      if (pattern.outcome.error) {
        if (pattern.outcome.error.message.includes('regex')) {
          suggestions.add('Consider using proper regex patterns');
        }
        if (pattern.outcome.error.message.includes('timeout')) {
          suggestions.add('Consider increasing timeout duration');
        }
      }
    });

    return Array.from(suggestions);
  }

  public addPattern(pattern: ToolCallPattern): void {
    this.patterns.push(pattern);
  }
}
