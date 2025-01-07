import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { MessageService } from '../MessageService';
import { MessageProcessingPipeline } from '../MessageProcessingPipeline';
import { TaskManagementService } from '../TaskManagementService';
import { TaskMetricsService } from '../TaskMetricsService';
import { Message, MessageProcessingResult, ValidationError } from '../../types/MessageTypes';

describe('MessageService', () => {
  let messageService: MessageService;
  let processingPipeline: MessageProcessingPipeline;
  let taskManagementService: TaskManagementService;
  let taskMetricsService: TaskMetricsService;

  beforeEach(() => {
    processingPipeline = new MessageProcessingPipeline();
    taskManagementService = new TaskManagementService();
    taskMetricsService = new TaskMetricsService();

    vi.spyOn(processingPipeline, 'processMessage');
    vi.spyOn(taskManagementService, 'startTask');
    vi.spyOn(taskManagementService, 'endTask');
    vi.spyOn(taskMetricsService, 'trackTokens');
    vi.spyOn(taskMetricsService, 'trackCost');

    messageService = new MessageService(
      processingPipeline,
      taskManagementService,
      taskMetricsService,
      { maxContentLength: 100 }
    );
  });

  const createValidMessage = (): Message => ({
    id: '123',
    type: 'user',
    content: 'Test message',
    timestamp: Date.now()
  });

  describe('sendMessage', () => {
    it('should process valid message successfully', async () => {
      const message = createValidMessage();
      const processResult: MessageProcessingResult = {
        success: true,
        data: message
      };

      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => resolve(processResult));
      });

      const result = await firstValueFrom(messageService.sendMessage(message));
      expect(result.success).toBe(true);
      expect(result.data).toEqual(message);
      expect(processingPipeline.processMessage).toHaveBeenCalledWith(message);
    });

    it('should handle processing errors', async () => {
      const message = createValidMessage();
      const error = new Error('Processing failed');
      
      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise((_, reject) => reject(error));
      });

      const result = await firstValueFrom(messageService.sendMessage(message));
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Processing failed');
    });

    it('should update task metrics', async () => {
      const message = createValidMessage();
      const taskId = '456';
      
      vi.mocked(taskManagementService.startTask).mockReturnValue(taskId);
      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => resolve({ success: true, data: message }));
      });

      await firstValueFrom(messageService.sendMessage(message));
      
      expect(taskMetricsService.trackTokens).toHaveBeenCalled();
      expect(taskManagementService.startTask).toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should update state with new message', async () => {
      const message = createValidMessage();
      
      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => resolve({ success: true, data: message }));
      });

      await firstValueFrom(messageService.sendMessage(message));
      const state = await firstValueFrom(messageService.getState());
      
      expect(state.messages).toContainEqual(message);
      expect(state.lastMessageId).toBe(message.id);
    });

    it('should track processing state', async () => {
      const message = createValidMessage();
      let isProcessing = false;
      
      messageService.getState().subscribe(state => {
        isProcessing = state.isProcessing;
      });

      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => {
          expect(isProcessing).toBe(true);
          resolve({ success: true, data: message });
        });
      });

      await firstValueFrom(messageService.sendMessage(message));
      expect(isProcessing).toBe(false);
    });
  });

  describe('Message Operations', () => {
    it('should update message content', async () => {
      const message = createValidMessage();
      const newContent = 'Updated content';
      
      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => resolve({ success: true, data: message }));
      });

      await firstValueFrom(messageService.sendMessage(message));
      messageService.updateMessageContent(message.id, newContent);
      
      const messages = await firstValueFrom(messageService.getMessages());
      const updatedMessage = messages.find(m => m.id === message.id);
      expect(updatedMessage?.content).toBe(newContent);
    });
  });

  describe('Task Management', () => {
    it('should end current task before starting new one', async () => {
      const message = createValidMessage();
      const currentTaskId = '789';
      const newTaskId = '101112';
      
      vi.mocked(taskManagementService.getCurrentTask).mockReturnValue({ id: currentTaskId });
      vi.mocked(taskManagementService.startTask).mockReturnValue(newTaskId);
      vi.mocked(processingPipeline.processMessage).mockImplementation(() => {
        return new Promise(resolve => resolve({ success: true, data: message }));
      });

      await firstValueFrom(messageService.sendMessage(message));
      
      expect(taskManagementService.endTask).toHaveBeenCalledWith(currentTaskId);
      expect(taskManagementService.startTask).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on dispose', () => {
      messageService.dispose();
      expect(() => firstValueFrom(messageService.getState())).rejects.toThrow();
    });
  });
}); 