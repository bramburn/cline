import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageService } from '../MessageService';
import { TaskManagementService } from '../TaskManagementService';
import { TaskMetricsService } from '../TaskMetricsService';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { firstValueFrom } from 'rxjs';

describe('MessageService', () => {
  let messageService: MessageService;
  let taskManagementService: TaskManagementService;
  let taskMetricsService: TaskMetricsService;
  let conversationHistoryService: ReactiveConversationHistoryService;
  let messageProcessingPipeline: MessageProcessingPipeline;

  beforeEach(() => {
    taskMetricsService = new TaskMetricsService();
    taskManagementService = new TaskManagementService();
    conversationHistoryService = new ReactiveConversationHistoryService({ taskDir: './test-tasks' });
    messageProcessingPipeline = new MessageProcessingPipeline();

    messageService = new MessageService(
      conversationHistoryService,
      taskManagementService,
      taskMetricsService
    );
  });

  describe('ask', () => {
    it('should create new task and track metrics', async () => {
      const startTaskSpy = vi.spyOn(taskManagementService, 'startTask');
      const trackTokensSpy = vi.spyOn(taskMetricsService, 'trackTokens');
      const trackCostSpy = vi.spyOn(taskMetricsService, 'trackCost');

      await firstValueFrom(messageService.ask('command', 'Test message'));

      expect(startTaskSpy).toHaveBeenCalled();
      expect(trackTokensSpy).toHaveBeenCalled();
      expect(trackCostSpy).toHaveBeenCalledWith(expect.any(String), 0);
    });

    it('should handle errors and fail task', async () => {
      const error = new Error('Test error');
      vi.spyOn(messageProcessingPipeline, 'processMessage').mockRejectedValue(error);
      const failTaskSpy = vi.spyOn(taskManagementService, 'failTask');

      try {
        await firstValueFrom(messageService.ask('command', 'Test message'));
      } catch (err) {
        expect(err).toBe(error);
        expect(failTaskSpy).toHaveBeenCalledWith(expect.any(String));
      }
    });
  });

  describe('say', () => {
    it('should update conversation state', async () => {
      const addMessageSpy = vi.spyOn(conversationHistoryService, 'addMessage');
      await firstValueFrom(messageService.say('text', 'Test response'));

      expect(addMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'say',
        say: 'text',
        text: 'Test response'
      }));
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      vi.spyOn(conversationHistoryService, 'addMessage').mockRejectedValue(error);
      const setErrorSpy = vi.spyOn(conversationHistoryService, 'setError');

      try {
        await firstValueFrom(messageService.say('text', 'Test response'));
      } catch (err) {
        expect(err).toBe(error);
        expect(setErrorSpy).toHaveBeenCalledWith(error.message);
      }
    });
  });

  describe('task management', () => {
    it('should end current task before starting new one', async () => {
      const taskId = taskManagementService.startTask();
      const endTaskSpy = vi.spyOn(taskManagementService, 'endTask');

      await firstValueFrom(messageService.ask('command', 'Test message'));

      expect(endTaskSpy).toHaveBeenCalledWith(taskId);
    });

    it('should track task metrics', async () => {
      const trackCacheOpSpy = vi.spyOn(taskMetricsService, 'trackCacheOperation');
      const trackCostSpy = vi.spyOn(taskMetricsService, 'trackCost');

      vi.spyOn(messageProcessingPipeline, 'processMessage').mockResolvedValue({
        ts: Date.now(),
        type: 'ask',
        ask: 'command',
        text: 'Test message',
        apiReqInfo: {
          cacheReads: 1,
          cacheWrites: 1,
          cost: 0.2
        }
      });

      await firstValueFrom(messageService.ask('command', 'Test message'));

      expect(trackCacheOpSpy).toHaveBeenCalledWith(expect.any(String), 'read');
      expect(trackCacheOpSpy).toHaveBeenCalledWith(expect.any(String), 'write');
      expect(trackCostSpy).toHaveBeenCalledWith(expect.any(String), 0.2);
    });
  });

  describe('message updates', () => {
    it('should handle content updates', async () => {
      const message = {
        ts: Date.now(),
        type: 'say' as const,
        say: 'text' as const,
        text: 'Initial content'
      };

      const updateMessageSpy = vi.spyOn(conversationHistoryService, 'updateMessage');

      await firstValueFrom(messageService.say('text', 'Initial content'));
      messageService.updateMessageContent(message.ts, 'Updated content');

      expect(updateMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Updated content'
      }));
    });

    it('should handle content appending', async () => {
      const message = {
        ts: Date.now(),
        type: 'say' as const,
        say: 'text' as const,
        text: ''
      };

      const updateMessageSpy = vi.spyOn(conversationHistoryService, 'updateMessage');

      await firstValueFrom(messageService.say('text', ''));
      messageService.appendMessageContent(message.ts, 'Part 1');
      messageService.appendMessageContent(message.ts, 'Part 2');

      expect(updateMessageSpy).toHaveBeenCalledWith(expect.objectContaining({
        text: 'Part 1Part 2'
      }));
    });
  });
}); 