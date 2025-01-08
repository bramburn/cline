import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { MessageService } from '../MessageService';
import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { TaskManagementService } from '../TaskManagementService';
import { TaskMetricsService } from '../TaskMetricsService';
import { firstValueFrom, of } from 'rxjs';
import { Message, MessageServiceConfig, MessageType } from '../../types/MessageTypes';
import { TaskState } from '../TaskManagementService';

describe('MessageService', () => {
  let messageService: MessageService;
  let processingPipeline: MessageProcessingPipeline;
  let taskManagementService: TaskManagementService;
  let taskMetricsService: TaskMetricsService;

  beforeEach(() => {
    // Create mock services
    processingPipeline = {
      processMessage: vi.fn().mockReturnValue(of({ success: true, data: {} }))
    } as unknown as MessageProcessingPipeline;

    taskManagementService = {
      getCurrentTask: vi.fn().mockReturnValue(null),
      startTask: vi.fn().mockReturnValue('task-123'),
      endTask: vi.fn().mockResolvedValue(undefined)
    } as unknown as TaskManagementService;

    taskMetricsService = {
      initializeMetrics: vi.fn(),
      trackTokens: vi.fn(),
      trackCost: vi.fn(),
      trackCacheOperation: vi.fn()
    } as unknown as TaskMetricsService;

    // Create service with mock dependencies
    const config: MessageServiceConfig = {
      maxContentLength: 100,
      maxHistorySize: 10,
      persistenceEnabled: true
    };

    messageService = new MessageService(
      processingPipeline,
      taskManagementService,
      taskMetricsService,
      config
    );
  });

  describe('Message Sending', () => {
    const createValidMessage = (): Message => ({
      id: 'test-message-1',
      type: 'user' as MessageType,
      content: 'Test message content',
      timestamp: Date.now()
    });

    it('should send a message successfully', async () => {
      const message = createValidMessage();
      const result = await firstValueFrom(messageService.sendMessage(message));

      expect(result.success).toBe(true);
      
      // Verify task management
      expect(taskManagementService.startTask).toHaveBeenCalled();
      
      // Verify processing pipeline
      expect(processingPipeline.processMessage).toHaveBeenCalledWith(message);
      
      // Verify metrics tracking
      expect(taskMetricsService.initializeMetrics).toHaveBeenCalledWith('task-123');
    });

    it('should update message state after sending', async () => {
      const message = createValidMessage();
      await firstValueFrom(messageService.sendMessage(message));

      const messages = await firstValueFrom(messageService.getMessages());
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe(message.id);
    });

    
  });

  describe('Service State Management', () => {
    it('should track processing state', async () => {
      const message: Message = {
        id: 'test-message-2',
        type: 'user' as MessageType,
        content: 'Processing state test',
        timestamp: Date.now()
      };

      const statePromise = firstValueFrom(messageService.getState());
      messageService.sendMessage(message);

      const state = await statePromise;
      expect(state.isProcessing).toBe(false);
    });

    it('should dispose of service resources', () => {
      const disposeSpy = vi.spyOn(messageService['state'], 'complete');
      messageService.dispose();

      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  describe('Task Management', () => {
    it('should end current task before starting new one', async () => {
      const currentTask: TaskState = { 
        id: 'existing-task', 
        status: 'active', 
        startTime: Date.now(), 
        metrics: { 
          tokenCount: 0, 
          cost: 0, 
          duration: 0 
        } 
      };

      vi.mocked(taskManagementService.getCurrentTask).mockReturnValue(currentTask);
      vi.mocked(taskManagementService.startTask).mockReturnValue('new-task');

      const message: Message = {
        id: 'task-management-test',
        type: 'user' as MessageType,
        content: 'Test task management',
        timestamp: Date.now()
      };

      await firstValueFrom(messageService.sendMessage(message));
      
      expect(taskManagementService.endTask).toHaveBeenCalledWith(currentTask.id);
      expect(taskManagementService.startTask).toHaveBeenCalled();
    });
  });

  describe('Token Estimation', () => {
    it('should estimate token count correctly', async () => {
      const message: Message = {
        id: 'token-test',
        type: 'user' as MessageType,
        content: 'This is a test message with some content',
        timestamp: Date.now()
      };

      const estimatedTokens = Math.ceil(message.content.length / 4);
      
      await firstValueFrom(messageService.sendMessage(message));
      
      expect(taskMetricsService.trackTokens).toHaveBeenCalledWith(
        expect.any(String), 
        estimatedTokens
      );
    });
  });

  describe('Message Updates', () => {
    it('should correctly update an existing message and maintain other messages', async () => {
      // Create two initial messages
      const message1 = {
        id: 'msg-1',
        type: 'user' as MessageType,
        content: 'Original message 1',
        timestamp: Date.now()
      };
      
      const message2 = {
        id: 'msg-2',
        type: 'user' as MessageType,
        content: 'Original message 2',
        timestamp: Date.now()
      };

      // Send both messages
      await firstValueFrom(messageService.sendMessage(message1));
      await firstValueFrom(messageService.sendMessage(message2));

      // Update the first message
      const updatedContent = 'Updated message 1 content';
      messageService.updateMessageContent(message1.id, updatedContent);

      // Get the current messages state
      const messages = await firstValueFrom(messageService.getMessages());

      // Verify the update was applied correctly
      expect(messages).toHaveLength(2);
      const updatedMessage = messages.find(m => m.id === message1.id);
      const unchangedMessage = messages.find(m => m.id === message2.id);

      expect(updatedMessage?.content).toBe(updatedContent);
      expect(unchangedMessage?.content).toBe(message2.content);
    });
  });
});
