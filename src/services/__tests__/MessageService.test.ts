import { MessageService } from '../MessageService';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { TaskManagementService } from '../TaskManagementService';
import { TaskMetricsService } from '../TaskMetricsService';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../ReactiveConversationHistoryService');
vi.mock('../MessageProcessingPipeline');

describe('MessageService', () => {
  let messageService: MessageService;
  let conversationHistoryService: ReactiveConversationHistoryService;
  let taskManagementService: TaskManagementService;
  let taskMetricsService: TaskMetricsService;

  beforeEach(() => {
    conversationHistoryService = new ReactiveConversationHistoryService({ taskDir: '/mock/dir' });
    taskMetricsService = new TaskMetricsService();
    taskManagementService = new TaskManagementService(taskMetricsService);
    messageService = new MessageService(
      conversationHistoryService,
      taskManagementService,
      taskMetricsService
    );
  });

  describe('ask', () => {
    it('should create new task and track metrics', (done) => {
      const message: ClineMessage = {
        ts: Date.now(),
        type: 'ask',
        ask: 'command',
        text: 'test command',
        apiReqInfo: {
          tokensIn: 10,
          tokensOut: 20,
          cost: 0.5,
          cacheReads: 1,
          cacheWrites: 2
        }
      };

      vi.spyOn(taskManagementService, 'startTask');
      vi.spyOn(taskMetricsService, 'trackTokens');
      vi.spyOn(taskMetricsService, 'trackCost');
      vi.spyOn(taskMetricsService, 'trackCacheOperation');

      messageService.ask('command', 'test command').subscribe({
        next: (response) => {
          expect(taskManagementService.startTask).toHaveBeenCalled();
          expect(taskMetricsService.trackTokens).toHaveBeenCalledTimes(2); // tokensIn and tokensOut
          expect(taskMetricsService.trackCost).toHaveBeenCalledWith(expect.any(String), 0.5);
          expect(taskMetricsService.trackCacheOperation).toHaveBeenCalledTimes(3); // reads and writes
          done();
        },
        error: done
      });
    });

    it('should handle errors and fail task', (done) => {
      const error = new Error('Test error');
      vi.spyOn(taskManagementService, 'failTask');

      messageService.ask('command', 'test command').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(taskManagementService.failTask).toHaveBeenCalledWith(expect.any(String), error);
          done();
        }
      });
    });
  });

  describe('say', () => {
    it('should update conversation state', (done) => {
      vi.spyOn(conversationHistoryService, 'setProcessing');
      vi.spyOn(conversationHistoryService, 'updateMessage');

      messageService.say('text', 'test message').subscribe({
        complete: () => {
          expect(conversationHistoryService.setProcessing).toHaveBeenCalledWith(true);
          expect(conversationHistoryService.updateMessage).toHaveBeenCalled();
          expect(conversationHistoryService.setProcessing).toHaveBeenCalledWith(false);
          done();
        },
        error: done
      });
    });

    it('should handle errors', (done) => {
      const error = new Error('Test error');
      vi.spyOn(conversationHistoryService, 'setError');

      messageService.say('text', 'test message').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          expect(conversationHistoryService.setError).toHaveBeenCalledWith(error.message);
          done();
        }
      });
    });
  });

  describe('task management', () => {
    it('should get current task', () => {
      vi.spyOn(taskManagementService, 'getCurrentTask');
      messageService.getCurrentTask();
      expect(taskManagementService.getCurrentTask).toHaveBeenCalled();
    });

    it('should get all tasks', () => {
      vi.spyOn(taskManagementService, 'getAllTasks');
      messageService.getAllTasks();
      expect(taskManagementService.getAllTasks).toHaveBeenCalled();
    });
  });

  describe('partial message updates', () => {
    it('should update partial message correctly', () => {
      const message: ClineMessage = {
        ts: Date.now(),
        type: 'say',
        say: 'text',
        text: 'partial message',
        partial: true
      };

      vi.spyOn(conversationHistoryService, 'updateMessage');
      messageService.updatePartialMessage(message);
      expect(conversationHistoryService.updateMessage).toHaveBeenCalledWith(message);
    });

    it('should handle non-partial message', () => {
      const message: ClineMessage = {
        ts: Date.now(),
        type: 'say',
        say: 'text',
        text: 'complete message',
        partial: false
      };

      vi.spyOn(conversationHistoryService, 'updateMessage');
      messageService.updatePartialMessage(message);
      expect(conversationHistoryService.updateMessage).toHaveBeenCalledWith(message);
    });
  });
}); 