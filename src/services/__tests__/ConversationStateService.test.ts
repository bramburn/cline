import { ConversationStateService } from '../ConversationStateService';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { firstValueFrom } from 'rxjs';

describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(() => {
    service = new ConversationStateService();
  });

  afterEach(() => {
    service.dispose();
  });

  describe('constructor', () => {
    it('should initialize with empty state when no history provided', () => {
      const state = service.getCurrentState();
      expect(state).toEqual({
        messages: [],
        isProcessing: false
      });
    });

    it('should initialize with history when provided', () => {
      const historyMessages: ClineMessage[] = [
        { type: 'say', text: 'test message', ts: 123 }
      ];
      service = new ConversationStateService({ messages: historyMessages });
      const state = service.getCurrentState();
      expect(state.messages).toEqual(historyMessages);
    });
  });

  describe('setState', () => {
    it('should update state partially', () => {
      service.setState({ isProcessing: true });
      const state = service.getCurrentState();
      expect(state.isProcessing).toBe(true);
      expect(state.messages).toEqual([]);
    });

    it('should merge new state with existing state', () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.setState({ messages: [message] });
      service.setState({ isProcessing: true });
      const state = service.getCurrentState();
      expect(state).toEqual({
        messages: [message],
        isProcessing: true
      });
    });
  });

  describe('updateMessage', () => {
    it('should add new message when not exists', () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.updateMessage(message);
      const state = service.getCurrentState();
      expect(state.messages).toEqual([message]);
      expect(state.lastMessageTs).toBe(message.ts);
    });

    it('should update existing message', () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      const updatedMessage: ClineMessage = { type: 'say', text: 'updated', ts: 123 };
      service.updateMessage(message);
      service.updateMessage(updatedMessage);
      const state = service.getCurrentState();
      expect(state.messages).toEqual([updatedMessage]);
      expect(state.lastMessageTs).toBe(updatedMessage.ts);
    });
  });

  describe('setAskResponse', () => {
    it('should set ask response with text and images', () => {
      const response = { status: 'ok' };
      const text = 'response text';
      const images = ['image1.png'];
      service.setAskResponse(response, text, images);
      const state = service.getCurrentState();
      expect(state.askResponse).toEqual(response);
      expect(state.askResponseText).toBe(text);
      expect(state.askResponseImages).toEqual(images);
    });
  });

  describe('clearAskResponse', () => {
    it('should clear ask response', () => {
      service.setAskResponse({ status: 'ok' }, 'text', ['image.png']);
      service.clearAskResponse();
      const state = service.getCurrentState();
      expect(state.askResponse).toBeUndefined();
      expect(state.askResponseText).toBeUndefined();
      expect(state.askResponseImages).toBeUndefined();
    });
  });

  describe('setProcessing', () => {
    it('should update processing state', () => {
      service.setProcessing(true);
      expect(service.getCurrentState().isProcessing).toBe(true);
      service.setProcessing(false);
      expect(service.getCurrentState().isProcessing).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const error = 'test error';
      service.setError(error);
      expect(service.getCurrentState().error).toBe(error);
    });

    it('should clear error when undefined provided', () => {
      service.setError('test error');
      service.setError(undefined);
      expect(service.getCurrentState().error).toBeUndefined();
    });
  });

  describe('getState', () => {
    it('should return observable of state', async () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.updateMessage(message);
      const state = await firstValueFrom(service.getState());
      expect(state.messages).toEqual([message]);
    });
  });

  describe('getMessages', () => {
    it('should return observable of messages', async () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.updateMessage(message);
      const messages = await firstValueFrom(service.getMessages());
      expect(messages).toEqual([message]);
    });
  });

  describe('dispose', () => {
    it('should complete the state subject', async () => {
      let completed = false;
      service.getState().subscribe({
        complete: () => { completed = true; }
      });
      service.dispose();
      expect(completed).toBe(true);
    });
  });
}); 