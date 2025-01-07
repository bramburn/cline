import { injectable } from 'inversify';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
  requestId: string;
}

export interface TokenMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  averageInputTokens: number;
  averageOutputTokens: number;
  usageHistory: TokenUsage[];
}

@injectable()
export class TokenTrackingService {
  private usageHistory: TokenUsage[] = [];
  private readonly MAX_HISTORY_SIZE = 1000;

  public trackUsage(inputTokens: number, outputTokens: number, requestId: string): void {
    const usage: TokenUsage = {
      inputTokens,
      outputTokens,
      timestamp: new Date(),
      requestId
    };

    this.usageHistory.push(usage);
    
    // Maintain history size limit
    if (this.usageHistory.length > this.MAX_HISTORY_SIZE) {
      this.usageHistory = this.usageHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  public getMetrics(): TokenMetrics {
    const totalInputTokens = this.usageHistory.reduce((sum, usage) => sum + usage.inputTokens, 0);
    const totalOutputTokens = this.usageHistory.reduce((sum, usage) => sum + usage.outputTokens, 0);
    const count = this.usageHistory.length;

    return {
      totalInputTokens,
      totalOutputTokens,
      averageInputTokens: count > 0 ? totalInputTokens / count : 0,
      averageOutputTokens: count > 0 ? totalOutputTokens / count : 0,
      usageHistory: [...this.usageHistory]
    };
  }

  public clearHistory(): void {
    this.usageHistory = [];
  }

  public getUsageForRequest(requestId: string): TokenUsage | undefined {
    return this.usageHistory.find(usage => usage.requestId === requestId);
  }
} 