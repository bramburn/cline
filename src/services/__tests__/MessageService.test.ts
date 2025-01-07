import { MessageService } from '../MessageService';
import { ClineMessage, ClineAsk, ClineSay } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';
import { ConversationStateService } from '../ConversationStateService';

// Mock ConversationStateService
jest.mock('../ConversationStateService');

describe('MessageService', () => {
  let service: MessageService;
  let mockConversationStateService: jest.Mocked<ConversationStateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessageService();
    mockConversationStateService = (ConversationStateService as jest.Mock).mock.instances[0];
  });

  describe('ask', () => {
    it('should process ask message and update state', async () => {
      const type: ClineAsk = 'command';
      const text = 'test command';
      const expectedResponse = {
        response: 'messageResponse' as const,
        text: '',
        images: []
      };

      const result = await firstValueFrom(service.ask(type, text));

      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(true);
      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ask',
          ask: type,
          text,
          partial: undefined
        })
      );
      expect(mockConversationStateService.setAskResponse).toHaveBeenCalledWith(
        expectedResponse.response,
        expectedResponse.text,
        expectedResponse.images
      );
      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(false);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle partial ask messages', async () => {
      const type: ClineAsk = 'command';
      const text = 'partial command';
      const partial = true;

      await firstValueFrom(service.ask(type, text, partial));

      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ask',
          ask: type,
          text,
          partial: true
        })
      );
    });

    it('should handle errors during ask process', async () => {
      const error = new Error('Test error');
      mockConversationStateService.setProcessing.mockImplementationOnce(() => {
        throw error;
      });

      await expect(firstValueFrom(service.ask('command'))).rejects.toThrow(error);
      expect(mockConversationStateService.setError).toHaveBeenCalledWith(error.message);
      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(false);
    });
  });

  describe('say', () => {
    it('should process say message and update state', async () => {
      const type: ClineSay = 'text';
      const text = 'test message';
      const images = ['image1.png'];

      await firstValueFrom(service.say(type, text, images));

      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(true);
      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'say',
          say: type,
          text,
          images,
          partial: undefined
        })
      );
      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(false);
    });

    it('should handle partial say messages', async () => {
      const type: ClineSay = 'text';
      const text = 'partial message';
      const partial = true;

      await firstValueFrom(service.say(type, text, undefined, partial));

      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'say',
          say: type,
          text,
          partial: true
        })
      );
    });

    it('should handle errors during say process', async () => {
      const error = new Error('Test error');
      mockConversationStateService.setProcessing.mockImplementationOnce(() => {
        throw error;
      });

      await expect(firstValueFrom(service.say('text'))).rejects.toThrow(error);
      expect(mockConversationStateService.setError).toHaveBeenCalledWith(error.message);
      expect(mockConversationStateService.setProcessing).toHaveBeenCalledWith(false);
    });
  });

  describe('updatePartialMessage', () => {
    it('should update existing partial message with same type and ask/say', () => {
      const currentMessages = [
        { type: 'say', say: 'text', text: 'old', partial: true, ts: 123 }
      ];
      mockConversationStateService.getCurrentState.mockReturnValue({
        messages: currentMessages,
        isProcessing: false
      });

      const newMessage: ClineMessage = {
        type: 'say',
        say: 'text',
        text: 'new',
        partial: true,
        ts: 456
      };

      service.updatePartialMessage(newMessage);

      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith({
        ...currentMessages[0],
        text: 'new'
      });
    });

    it('should add new message when no matching partial message exists', () => {
      const currentMessages: ClineMessage[] = [];
      mockConversationStateService.getCurrentState.mockReturnValue({
        messages: currentMessages,
        isProcessing: false
      });

      const newMessage: ClineMessage = {
        type: 'say',
        say: 'text',
        text: 'new',
        partial: true,
        ts: 123
      };

      service.updatePartialMessage(newMessage);

      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(newMessage);
    });

    it('should add new message when message is not partial', () => {
      const newMessage: ClineMessage = {
        type: 'say',
        say: 'text',
        text: 'complete',
        partial: false,
        ts: 123
      };

      service.updatePartialMessage(newMessage);

      expect(mockConversationStateService.updateMessage).toHaveBeenCalledWith(newMessage);
    });
  });

  describe('getState and getMessages', () => {
    it('should delegate getState to ConversationStateService', () => {
      service.getState();
      expect(mockConversationStateService.getState).toHaveBeenCalled();
    });

    it('should delegate getMessages to ConversationStateService', () => {
      service.getMessages();
      expect(mockConversationStateService.getMessages).toHaveBeenCalled();
    });
  });
}); 