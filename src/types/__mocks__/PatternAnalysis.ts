export type PatternAnalysis = {
  toolId: string;
  parameters: Record<string, any>;
  outcome: {
    success: boolean;
    duration: number;
  };
  timestamp: Date;
};
