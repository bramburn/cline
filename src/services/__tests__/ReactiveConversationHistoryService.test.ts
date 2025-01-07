import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

describe('ReactiveConversationHistoryService', () => {
  let service: ReactiveConversationHistoryService;

  beforeEach(() => {
    service = new ReactiveConversationHistoryService();
    vi.useFakeTimers();
  });

  afterEach(() => {
    service.dispose();
    vi.useRealTimers();
  });

  const createMessage = (content: string, ts: number = Date.now()): ClineMessage => ({
    content,
    ts,
    role: 'user'
  });

  describe('Message Management', () => {
    it('should add messages to the conversation', async () => {
      const message = createMessage('Test message');
      service.addMessage(message);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should update existing messages', async () => {
      const originalMessage = createMessage('Original');
      const updatedMessage = { ...originalMessage, content: 'Updated' };

      service.addMessage(originalMessage);
      service.updateMessage(updatedMessage);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(1);
      expect(messages[0].content).toBe('Updated');
    });

    it('should delete messages', async () => {
      const message = createMessage('To be deleted');
      service.addMessage(message);
      service.deleteMessage(message);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(0);
    });

    it('should maintain message order', async () => {
      const message1 = createMessage('First', 1);
      const message2 = createMessage('Second', 2);
      const message3 = createMessage('Third', 3);

      service.addMessage(message1);
      service.addMessage(message2);
      service.addMessage(message3);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    it('should enforce maximum message limit', async () => {
      const maxMessages = 1000;
      for (let i = 0; i < maxMessages + 5; i++) {
        service.addMessage(createMessage(`Message ${i}`, i));
      }

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(maxMessages);
      expect(messages[0].content).toBe('Message 5');
      expect(messages[messages.length - 1].content).toBe(`Message ${maxMessages + 4}`);
    });
  });

  describe('State Management', () => {
    it('should update processing state', async () => {
      service.setProcessing(true);
      const state = await firstValueFrom(service.getState());
      expect(state.isProcessing).toBe(true);
    });

    it('should update error state', async () => {
      const errorMessage = 'Test error';
      service.setError(errorMessage);
      const state = await firstValueFrom(service.getState());
      expect(state.error).toBe(errorMessage);
    });

    it('should clear error state', async () => {
      service.setError('Test error');
      service.setError(undefined);
      const state = await firstValueFrom(service.getState());
      expect(state.error).toBeUndefined();
    });
  });

  describe('Observable Behavior', () => {
    it('should emit state updates to all subscribers', async () => {
      const states: any[] = [];
      const subscription = service.getState().subscribe(state => states.push(state));

      service.setProcessing(true);
      service.addMessage(createMessage('Test'));
      service.setError('Error');

      expect(states).toHaveLength(4); // Initial state + 3 updates
      subscription.unsubscribe();
    });

    it('should share replay of latest state', async () => {
      const message = createMessage('Test');
      service.addMessage(message);

      // New subscriber should get latest state immediately
      const state = await firstValueFrom(service.getState());
      expect(state.messages).toHaveLength(1);
      expect(state.messages[0]).toEqual(message);
    });
  });
}); 