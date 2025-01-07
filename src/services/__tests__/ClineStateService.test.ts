import { describe, it, expect, beforeEach } from 'vitest';
import { ClineStateService } from '../ClineStateService';

describe('ClineStateService', () => {
  let stateService: ClineStateService;

  beforeEach(() => {
    stateService = new ClineStateService();
  });

  describe('abort state management', () => {
    it('should update abort state', () => {
      stateService.updateAbort(true);
      expect(stateService.getCurrentState().abort).toBe(true);
    });

    it('should throw error for invalid abort state', () => {
      expect(() => stateService.updateAbort('invalid' as any)).toThrow('Invalid abort state');
    });
  });

  describe('streaming state management', () => {
    it('should update streaming state', () => {
      stateService.updateIsStreaming(true);
      expect(stateService.getCurrentState().isStreaming).toBe(true);
    });

    it('should throw error for invalid streaming state', () => {
      expect(() => stateService.updateIsStreaming('invalid' as any)).toThrow('Invalid streaming state');
    });
  });

  describe('user message content management', () => {
    it('should set user message content', () => {
      const content = [{ type: 'text', text: 'test' }];
      stateService.setUserMessageContent(content);
      expect(stateService.getCurrentState().userMessageContent).toEqual(content);
    });

    it('should throw error for invalid user message content', () => {
      expect(() => stateService.setUserMessageContent('invalid' as any)).toThrow('Invalid user message content');
    });

    it('should throw error for invalid content block type', () => {
      expect(() => stateService.setUserMessageContent([{ type: 'invalid' }])).toThrow('Invalid content block type');
    });
  });

  describe('user message content ready management', () => {
    it('should update user message content ready state', () => {
      stateService.updateUserMessageContentReady(true);
      expect(stateService.getCurrentState().userMessageContentReady).toBe(true);
    });

    it('should throw error for invalid ready state', () => {
      expect(() => stateService.updateUserMessageContentReady('invalid' as any)).toThrow('Invalid ready state');
    });
  });

  describe('assistant message content management', () => {
    it('should set assistant message content', () => {
      const content = [{ type: 'text', text: 'test' }];
      stateService.setAssistantMessageContent(content);
      expect(stateService.getCurrentState().assistantMessageContent).toEqual(content);
    });

    it('should throw error for invalid assistant message content', () => {
      expect(() => stateService.setAssistantMessageContent('invalid' as any)).toThrow('Invalid assistant message content');
    });
  });

  describe('consecutive auto approved requests management', () => {
    it('should increment consecutive auto approved requests', () => {
      stateService.incrementConsecutiveAutoApprovedRequests();
      expect(stateService.getCurrentState().consecutiveAutoApprovedRequests).toBe(1);
    });

    it('should reset consecutive auto approved requests', () => {
      stateService.incrementConsecutiveAutoApprovedRequests();
      stateService.resetConsecutiveAutoApprovedRequests();
      expect(stateService.getCurrentState().consecutiveAutoApprovedRequests).toBe(0);
    });
  });

  describe('state updates', () => {
    it('should emit state updates', (done) => {
      stateService.getStateUpdates().subscribe((state) => {
        expect(state.abort).toBe(true);
        done();
      });
      stateService.updateAbort(true);
    });
  });
});
