import { Container } from 'inversify';
import { TYPES } from '../../types';

// Core Services
import { APIConfigurationService } from '../../services/APIConfigurationService';
import { MessageService } from '../../services/MessageService';
import { CustomInstructionsService } from '../../services/CustomInstructionsService';
import { ConversationStateService } from '../../services/ConversationStateService';
import { MessageProcessingPipeline } from '../../services/MessageProcessingPipeline';

// API and Request Services
import { ApiRequestService } from '../../services/ApiRequestService';
import { StreamController } from '../../services/StreamController';
import { StreamHandlerService } from '../../services/StreamHandlerService';
import { TokenTrackingService } from '../../services/TokenTrackingService';
import { ApiRequestMetrics } from '../../services/ApiRequestMetrics';

// Task Management Services
import { TaskManagementService } from '../../services/TaskManagementService';
import { TaskMetricsService } from '../../services/TaskMetricsService';

// Tool Services
import { ToolCallPatternAnalyzer } from '../../services/ToolCallPatternAnalyzer';
import { ToolCallOptimizationAgent } from '../../services/ToolCallOptimizationAgent';
import { ToolCallRetryService } from '../../services/ToolCallRetryService';
import { ToolCallSuggestionGenerator } from '../../services/ToolCallSuggestionGenerator';
import { ToolCallErrorReporter } from '../../services/ToolCallErrorReporter';

// Utility Services
import { NotificationService } from '../../services/NotificationService';
import { ConsoleLogger } from '../../utils/logger';
import { ErrorReportingService } from '../../services/ErrorReportingService';

// Browser Services
import { BrowserSessionService } from '../../services/BrowserSessionService';
import { BrowserActionService } from '../../services/BrowserActionService';
import { BrowserActionResultService } from '../../services/BrowserActionResultService';

// Conversation Services
import { ConversationHistoryService } from '../../services/ConversationHistoryService';
import { ReactiveConversationHistoryService } from '../../services/ReactiveConversationHistoryService';

// Command Services
import { CommandExecutionService } from '../../services/CommandExecutionService';

// Service Interfaces
import { IAPIConfigurationService } from '../../types/services/IAPIConfigurationService';
import { IMessageService } from '../../types/services/IMessageService';
import { ICustomInstructionsService } from '../../types/services/ICustomInstructionsService';
import { IStreamHandlerService } from '../../types/services/IStreamHandlerService';
import { IStreamController } from '../../types/services/IStreamController';
import { ITokenTrackingService } from '../../types/services/ITokenTrackingService';
import { IApiRequestService } from '../../types/services/IApiRequestService';
import { ITaskManagementService } from '../../types/services/ITaskManagementService';
import { ITaskMetricsService } from '../../types/services/ITaskMetricsService';
import { IToolCallPatternAnalyzer } from '../../types/services/IToolCallPatternAnalyzer';
import { IToolCallOptimizationAgent } from '../../types/services/IToolCallOptimizationAgent';
import { IReactiveConversationHistoryService } from '../../types/services/IReactiveConversationHistoryService';

export function registerServices(container: Container): void {
  // Core Services
  container.bind<IAPIConfigurationService>(TYPES.APIConfigurationService).to(APIConfigurationService);
  container.bind<IMessageService>(TYPES.MessageService).to(MessageService);
  container.bind<ICustomInstructionsService>(TYPES.CustomInstructionsService).to(CustomInstructionsService);
  container.bind(TYPES.ConversationStateService).to(ConversationStateService);
  container.bind(TYPES.MessageProcessingPipeline).to(MessageProcessingPipeline);

  // API and Request Services
  container.bind<IApiRequestService>(TYPES.ApiRequestService).to(ApiRequestService);
  container.bind<IStreamController>(TYPES.StreamController).to(StreamController);
  container.bind<IStreamHandlerService>(TYPES.StreamHandlerService).to(StreamHandlerService);
  container.bind<ITokenTrackingService>(TYPES.TokenTrackingService).to(TokenTrackingService);
  container.bind(TYPES.ApiRequestMetrics).to(ApiRequestMetrics);

  // Task Management Services
  container.bind<ITaskManagementService>(TYPES.TaskManagementService).to(TaskManagementService);
  container.bind<ITaskMetricsService>(TYPES.TaskMetricsService).to(TaskMetricsService);

  // Tool Services
  container.bind<IToolCallPatternAnalyzer>(TYPES.ToolCallPatternAnalyzer).to(ToolCallPatternAnalyzer);
  container.bind<IToolCallOptimizationAgent>(TYPES.ToolCallOptimizationAgent).to(ToolCallOptimizationAgent);
  container.bind(TYPES.ToolCallRetryService).to(ToolCallRetryService);
  container.bind(TYPES.ToolCallSuggestionGenerator).to(ToolCallSuggestionGenerator);
  container.bind(TYPES.ToolCallErrorReporter).to(ToolCallErrorReporter);

  // Utility Services
  container.bind(TYPES.NotificationService).to(NotificationService);
  container.bind(TYPES.Logger).to(ConsoleLogger);
  container.bind(TYPES.ErrorReportingService).to(ErrorReportingService);

  // Browser Services
  container.bind(TYPES.BrowserSessionService).to(BrowserSessionService);
  container.bind(TYPES.BrowserActionService).to(BrowserActionService);
  container.bind(TYPES.BrowserActionResultService).to(BrowserActionResultService);

  // Conversation Services
  container.bind(TYPES.ConversationHistoryService).to(ConversationHistoryService);
  container.bind<IReactiveConversationHistoryService>(TYPES.ReactiveConversationHistoryService)
    .to(ReactiveConversationHistoryService)
    .inSingletonScope();

  // Command Services
  container.bind(TYPES.CommandExecutionService).to(CommandExecutionService);
} 