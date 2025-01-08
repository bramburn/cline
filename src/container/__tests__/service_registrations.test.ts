import { describe, it, expect } from 'vitest';
import { container } from '../index';
import { TYPES } from '../../types';

// Import all interfaces
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

describe('Service Registrations', () => {
  describe('Core Services', () => {
    it('should resolve APIConfigurationService', () => {
      const service = container.get<IAPIConfigurationService>(TYPES.APIConfigurationService);
      expect(service).toBeDefined();
      expect(service.getConfiguration).toBeDefined();
    });

    it('should resolve MessageService', () => {
      const service = container.get<IMessageService>(TYPES.MessageService);
      expect(service).toBeDefined();
      expect(service.sendMessage).toBeDefined();
    });

    it('should resolve CustomInstructionsService', () => {
      const service = container.get<ICustomInstructionsService>(TYPES.CustomInstructionsService);
      expect(service).toBeDefined();
      expect(service.getInstructions).toBeDefined();
    });
  });

  describe('API and Request Services', () => {
    it('should resolve ApiRequestService', () => {
      const service = container.get<IApiRequestService>(TYPES.ApiRequestService);
      expect(service).toBeDefined();
      expect(service.request).toBeDefined();
    });

    it('should resolve StreamController', () => {
      const service = container.get<IStreamController>(TYPES.StreamController);
      expect(service).toBeDefined();
      expect(service.getProgressUpdates).toBeDefined();
    });

    it('should resolve StreamHandlerService', () => {
      const service = container.get<IStreamHandlerService>(TYPES.StreamHandlerService);
      expect(service).toBeDefined();
      expect(service.handleStream).toBeDefined();
    });

    it('should resolve TokenTrackingService', () => {
      const service = container.get<ITokenTrackingService>(TYPES.TokenTrackingService);
      expect(service).toBeDefined();
      expect(service.trackTokensIn).toBeDefined();
    });
  });

  describe('Task Management Services', () => {
    it('should resolve TaskManagementService', () => {
      const service = container.get<ITaskManagementService>(TYPES.TaskManagementService);
      expect(service).toBeDefined();
      expect(service.startTask).toBeDefined();
    });

    it('should resolve TaskMetricsService', () => {
      const service = container.get<ITaskMetricsService>(TYPES.TaskMetricsService);
      expect(service).toBeDefined();
      expect(service.initializeMetrics).toBeDefined();
    });
  });

  describe('Tool Services', () => {
    it('should resolve ToolCallPatternAnalyzer', () => {
      const service = container.get<IToolCallPatternAnalyzer>(TYPES.ToolCallPatternAnalyzer);
      expect(service).toBeDefined();
      expect(service.recordToolCall).toBeDefined();
    });

    it('should resolve ToolCallOptimizationAgent', () => {
      const service = container.get<IToolCallOptimizationAgent>(TYPES.ToolCallOptimizationAgent);
      expect(service).toBeDefined();
      expect(service.optimizeToolCall).toBeDefined();
    });

    it('should resolve ToolCallRetryService', () => {
      const service = container.get(TYPES.ToolCallRetryService);
      expect(service).toBeDefined();
    });

    it('should resolve ToolCallSuggestionGenerator', () => {
      const service = container.get(TYPES.ToolCallSuggestionGenerator);
      expect(service).toBeDefined();
    });

    it('should resolve ToolCallErrorReporter', () => {
      const service = container.get(TYPES.ToolCallErrorReporter);
      expect(service).toBeDefined();
    });
  });

  describe('Utility Services', () => {
    it('should resolve NotificationService', () => {
      const service = container.get(TYPES.NotificationService);
      expect(service).toBeDefined();
    });

    it('should resolve ErrorReportingService', () => {
      const service = container.get(TYPES.ErrorReportingService);
      expect(service).toBeDefined();
    });
  });

  describe('Browser Services', () => {
    it('should resolve BrowserSessionService', () => {
      const service = container.get(TYPES.BrowserSessionService);
      expect(service).toBeDefined();
    });

    it('should resolve BrowserActionService', () => {
      const service = container.get(TYPES.BrowserActionService);
      expect(service).toBeDefined();
    });

    it('should resolve BrowserActionResultService', () => {
      const service = container.get(TYPES.BrowserActionResultService);
      expect(service).toBeDefined();
    });
  });

  describe('Conversation Services', () => {
    it('should resolve ConversationHistoryService', () => {
      const service = container.get(TYPES.ConversationHistoryService);
      expect(service).toBeDefined();
    });

    it('should resolve ReactiveConversationHistoryService', () => {
      const reactiveConversationHistoryService = container.get<IReactiveConversationHistoryService>(TYPES.ReactiveConversationHistoryService);
      
      expect(reactiveConversationHistoryService).toBeDefined();
      expect(reactiveConversationHistoryService.getCurrentState).toBeDefined();
      expect(reactiveConversationHistoryService.getStateUpdates).toBeDefined();
      expect(reactiveConversationHistoryService.addMessage).toBeDefined();
      expect(reactiveConversationHistoryService.updateLastMessage).toBeDefined();
      expect(reactiveConversationHistoryService.removeLastMessage).toBeDefined();
      expect(reactiveConversationHistoryService.saveCurrentState).toBeDefined();
      expect(reactiveConversationHistoryService.loadState).toBeDefined();
      expect(reactiveConversationHistoryService.updateMetadata).toBeDefined();
      expect(reactiveConversationHistoryService.setCurrentTaskDir).toBeDefined();
      expect(reactiveConversationHistoryService.getLastError).toBeDefined();
      expect(reactiveConversationHistoryService.filterMessages).toBeDefined();
      expect(reactiveConversationHistoryService.mapMessages).toBeDefined();
    });
  });

  describe('Command Services', () => {
    it('should resolve CommandExecutionService', () => {
      const service = container.get(TYPES.CommandExecutionService);
      expect(service).toBeDefined();
    });
  });
}); 