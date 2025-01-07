export interface ErrorReport {
  error: Error;
  timestamp: number;
}

export class ToolCallErrorReporter {
  private errorHistory: ErrorReport[] = [];

  public reportError(toolId: string, parameters: Record<string, any>, error: Error): void {
    this.errorHistory.push({
      error,
      timestamp: Date.now()
    });
  }

  public getHistory(): ErrorReport[] {
    return [...this.errorHistory];
  }

  public clearHistory(): void {
    this.errorHistory = [];
  }
}
