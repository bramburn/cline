export interface TokenTrackingMetrics {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
  lastTokensIn?: number;
  lastTokensOut?: number;
  lastCost?: number;
}

export interface ITokenTrackingService {
  trackTokensIn(tokens: number): void;
  trackTokensOut(tokens: number): void;
  trackCost(cost: number): void;
  getMetrics(): TokenTrackingMetrics;
  resetMetrics(): void;
} 