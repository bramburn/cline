import { IReactiveConversationHistoryService } from './services/IReactiveConversationHistoryService';

export const TYPES = {
  // Core Services
  APIConfigurationService: Symbol.for('APIConfigurationService'),
  MessageService: Symbol.for('MessageService'),
  CustomInstructionsService: Symbol.for('CustomInstructionsService'),
  ConversationStateService: Symbol.for('ConversationStateService'),
  MessageProcessingPipeline: Symbol.for('MessageProcessingPipeline'),
  
  // API and Request Services
  ApiRequestService: Symbol.for('ApiRequestService'),
  StreamController: Symbol.for('StreamController'),
  StreamHandlerService: Symbol.for('StreamHandlerService'),
  TokenTrackingService: Symbol.for('TokenTrackingService'),
  ApiRequestMetrics: Symbol.for('ApiRequestMetrics'),
  
  // Task Management Services
  TaskManagementService: Symbol.for('TaskManagementService'),
  TaskMetricsService: Symbol.for('TaskMetricsService'),
  
  // Tool Services
  ToolCallPatternAnalyzer: Symbol.for('ToolCallPatternAnalyzer'),
  ToolCallOptimizationAgent: Symbol.for('ToolCallOptimizationAgent'),
  ToolCallRetryService: Symbol.for('ToolCallRetryService'),
  ToolCallSuggestionGenerator: Symbol.for('ToolCallSuggestionGenerator'),
  ToolCallErrorReporter: Symbol.for('ToolCallErrorReporter'),
  
  // Utility Services
  NotificationService: Symbol.for('NotificationService'),
  Logger: Symbol.for('Logger'),
  ErrorReportingService: Symbol.for('ErrorReportingService'),
  
  // Browser Services
  BrowserSessionService: Symbol.for('BrowserSessionService'),
  BrowserActionService: Symbol.for('BrowserActionService'),
  BrowserActionResultService: Symbol.for('BrowserActionResultService'),
  
  // Conversation Services
  ConversationHistoryService: Symbol.for('ConversationHistoryService'),
  ReactiveConversationHistoryService: Symbol.for('ReactiveConversationHistoryService'),
  
  // Command Services
  CommandExecutionService: Symbol.for('CommandExecutionService')
} as const;

export type ServiceIdentifiers = typeof TYPES; 