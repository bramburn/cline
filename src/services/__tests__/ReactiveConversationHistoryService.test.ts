import { firstValueFrom } from 'rxjs';
import { ReactiveConversationHistoryService } from '../ReactiveConversationHistoryService';
import { ConversationMessage, ValidationError, ConversationError } from '../../types/conversation';

describe('ReactiveConversationHistoryService', () => {
  let service: ReactiveConversationHistoryService;

  beforeEach(() => {
    service = new ReactiveConversationHistoryService();
  });

  const createMessage = (content: string, type: 'user' | 'assistant' = 'user'): ConversationMessage => ({
    id: Math.random().toString(36).substring(7),
    content,
    timestamp: Date.now(),
    type
  });

  describe('Message Operations', () => {
    it('should add messages', async () => {
      const message = createMessage('Test message');
      await service.addMessage(message);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toBeDefined();
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should update messages', async () => {
      const message = createMessage('Original message');
      await service.addMessage(message);

      await service.updateMessage(message.id, 'Updated message');

      const messages = await firstValueFrom(service.getMessages());
      expect(messages[0].content).toBe('Updated message');
    });

    it('should delete messages', async () => {
      const message1 = createMessage('Message 1');
      const message2 = createMessage('Message 2');
      
      await service.addMessage(message1);
      await service.addMessage(message2);

      await service.deleteMessage(message1.id);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message2);
    });

    it('should clear history', async () => {
      await service.addMessage(createMessage('Message 1'));
      await service.addMessage(createMessage('Message 2'));

      await service.clearHistory();

      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toHaveLength(0);
    });
  });

  describe('Validation', () => {
    it('should throw ValidationError for missing required fields', async () => {
      const invalidMessage = {
        id: '123',
        content: 'test'
      } as ConversationMessage;

      await expect(service.addMessage(invalidMessage)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid message type', async () => {
      const invalidMessage = {
        ...createMessage('test'),
        type: 'invalid' as 'user'
      };

      await expect(service.addMessage(invalidMessage)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for content exceeding max length', async () => {
      const longContent = 'a'.repeat(11000);
      const message = createMessage(longContent);

      await expect(service.addMessage(message)).rejects.toThrow(ValidationError);
    });
  });

  describe('Error Handling', () => {
    it('should throw ConversationError when updating non-existent message', async () => {
      await expect(service.updateMessage('non-existent', 'content'))
        .rejects.toThrow(ConversationError);
    });

    it('should throw ConversationError when deleting non-existent message', async () => {
      await expect(service.deleteMessage('non-existent'))
        .rejects.toThrow(ConversationError);
    });
  });

  describe('State Management', () => {
    it('should handle processing state correctly', async () => {
      const states: boolean[] = [];
      service.getState().subscribe(state => states.push(state.isProcessing));

      await service.addMessage(createMessage('test'));

      expect(states).toContain(true); // Processing started
      expect(states[states.length - 1]).toBe(false); // Processing ended
    });

    it('should maintain message order', async () => {
      const message1 = createMessage('First');
      const message2 = createMessage('Second');
      const message3 = createMessage('Third');

      await service.addMessage(message1);
      await service.addMessage(message2);
      await service.addMessage(message3);

      const messages = await firstValueFrom(service.getMessages());
      expect(messages.map(m => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    it('should handle message limit correctly', async () => {
      const messages = Array.from({ length: 101 }, (_, i) => 
        createMessage(`Message ${i + 1}`)
      );

      for (const message of messages) {
        await service.addMessage(message);
      }

      const resultMessages = await firstValueFrom(service.getMessages());
      expect(resultMessages).toHaveLength(100);
      expect(resultMessages[0].content).toBe('Message 2'); // First message should be removed
      expect(resultMessages[99].content).toBe('Message 101');
    });
  });
}); 