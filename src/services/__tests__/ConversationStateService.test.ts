import { ConversationStateService } from '../ConversationStateService';
import { ClineMessage } from '../../shared/ExtensionMessage';
import { describe, it, expect, beforeEach } from 'vitest';

describe('ConversationStateService', () => {
  let service: ConversationStateService;

  beforeEach(() => {
    service = new ConversationStateService();
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

  describe('clearMessages', () => {
    it('should clear all messages and lastMessageTs', () => {
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.updateMessage(message);
      service.clearMessages();
      const state = service.getCurrentState();
      expect(state.messages).toEqual([]);
      expect(state.lastMessageTs).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    it('should notify listeners of state changes', () => {
      const listener = vi.fn();
      const unsubscribe = service.subscribe(listener);
      
      const message: ClineMessage = { type: 'say', text: 'test', ts: 123 };
      service.updateMessage(message);
      
      expect(listener).toHaveBeenCalledWith(expect.objectContaining({
        messages: [message],
        lastMessageTs: message.ts
      }));

      unsubscribe();
      service.updateMessage({ ...message, text: 'updated' });
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});