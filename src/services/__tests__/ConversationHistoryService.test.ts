import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ConversationHistoryService } from '../ConversationHistoryService';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GlobalFileNames } from '../../core/webview/ClineProvider';
import { firstValueFrom } from 'rxjs';
import { ConversationHistoryState } from '../../types/ConversationHistory';
import { Anthropic } from '@anthropic-ai/sdk';

// Mock fs/promises
vi.mock('fs/promises');
const mockedFs = fs as ReturnType<typeof vi.mocked<typeof fs>>;

describe('ConversationHistoryService', () => {
  const mockTaskDir = '/mock/task/dir';
  let service: ConversationHistoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConversationHistoryService({ taskDir: mockTaskDir });
  });

  afterEach(() => {
    service.dispose();
  });

  describe('constructor', () => {
    it('should throw error if taskDir is not provided', () => {
      expect(() => new ConversationHistoryService({ taskDir: '' })).toThrow('Task directory is required');
    });

    it('should initialize with empty history if no initial history provided', () => {
      const result = service.getCurrentHistory();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
    });

    it('should initialize with provided history', () => {
      const initialHistory: Anthropic.MessageParam[] = [{ role: 'user' as const, content: 'test' }];
      const serviceWithHistory = new ConversationHistoryService({
        taskDir: mockTaskDir,
        initialHistory
      });
      const result = serviceWithHistory.getCurrentHistory();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(initialHistory);
      }
      serviceWithHistory.dispose();
    });
  });

  describe('addMessage', () => {
    it('should add message to history', async () => {
      const message: Anthropic.MessageParam = { role: 'user' as const, content: 'test' };
      mockedFs.writeFile.mockResolvedValueOnce(undefined);

      const result = await firstValueFrom(service.addMessage(message));
      expect(result.success).toBe(true);

      const historyResult = service.getCurrentHistory();
      expect(historyResult.success).toBe(true);
      if (historyResult.success) {
        expect(historyResult.data).toEqual([message]);
      }
    });

    it('should handle persistence error', async () => {
      const message: Anthropic.MessageParam = { role: 'user' as const, content: 'test' };
      const error = new Error('Write failed');
      mockedFs.writeFile.mockRejectedValueOnce(error);

      const result = await firstValueFrom(service.addMessage(message));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERSISTENCE_ERROR');
        expect(result.error.originalError).toBe(error);
      }
    });

    it('should not add message if service is disposed', async () => {
      service.dispose();
      const message: Anthropic.MessageParam = { role: 'user' as const, content: 'test' };
      
      const result = await firstValueFrom(service.addMessage(message));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('INVALID_STATE');
      }
    });
  });

  describe('overwriteHistory', () => {
    it('should overwrite existing history', async () => {
      const initialMessage: Anthropic.MessageParam = { role: 'user' as const, content: 'initial' };
      const newHistory: Anthropic.MessageParam[] = [{ role: 'user' as const, content: 'new' }];
      
      mockedFs.writeFile.mockResolvedValue(undefined);

      await firstValueFrom(service.addMessage(initialMessage));
      const result = await firstValueFrom(service.overwriteHistory(newHistory));
      
      expect(result.success).toBe(true);
      const historyResult = service.getCurrentHistory();
      expect(historyResult.success).toBe(true);
      if (historyResult.success) {
        expect(historyResult.data).toEqual(newHistory);
      }
    });
  });

  describe('setDeletedRange', () => {
    it('should set deleted range', async () => {
      const range: [number, number] = [1, 3];
      mockedFs.writeFile.mockResolvedValueOnce(undefined);

      const result = await firstValueFrom(service.setDeletedRange(range));
      expect(result.success).toBe(true);

      // Verify the range was set in the state
      const filePath = path.join(mockTaskDir, GlobalFileNames.apiConversationHistory);
      const lastCall = mockedFs.writeFile.mock.lastCall;
      if (lastCall) {
        const [savedPath, savedContent] = lastCall;
        expect(savedPath).toBe(filePath);
        const savedState = JSON.parse(savedContent as string) as ConversationHistoryState;
        expect(savedState.deletedRange).toEqual(range);
      }
    });
  });

  describe('loadFromFile', () => {
    it('should load history from file', async () => {
      const savedState: ConversationHistoryState = {
        messages: [{ role: 'user' as const, content: 'test' }],
        deletedRange: [1, 3]
      };
      
      mockedFs.readFile.mockResolvedValueOnce(JSON.stringify(savedState));
      
      const result = await firstValueFrom(service.loadFromFile());
      expect(result.success).toBe(true);

      const historyResult = service.getCurrentHistory();
      expect(historyResult.success).toBe(true);
      if (historyResult.success) {
        expect(historyResult.data).toEqual(savedState.messages);
      }
    });

    it('should handle file read error', async () => {
      const error = new Error('Read failed');
      mockedFs.readFile.mockRejectedValueOnce(error);
      
      const result = await firstValueFrom(service.loadFromFile());
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('PERSISTENCE_ERROR');
        expect(result.error.originalError).toBe(error);
      }
    });
  });
}); 