import { describe, it, expect, beforeEach } from 'vitest';
import { ClineStateService } from '../ClineStateService';
import { firstValueFrom } from 'rxjs';

describe('ClineStateService', () => {
  let stateService: ClineStateService;

  beforeEach(() => {
    stateService = new ClineStateService();
  });

  describe('abort state management', () => {
    it('should update abort state', async () => {
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.updateAbort(true);
      const state = await statePromise;
      expect(state.abort).toBe(true);
    });

    it('should throw error for invalid abort state', () => {
      expect(() => stateService.updateAbort('invalid' as any)).toThrow('Invalid abort state');
    });
  });

  describe('streaming state management', () => {
    it('should update streaming state', async () => {
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.updateIsStreaming(true);
      const state = await statePromise;
      expect(state.isStreaming).toBe(true);
    });

    it('should throw error for invalid streaming state', () => {
      expect(() => stateService.updateIsStreaming('invalid' as any)).toThrow('Invalid streaming state');
    });
  });

  describe('user message content management', () => {
    it('should set user message content', async () => {
      const content = [{ type: 'text', text: 'test' }];
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.setUserMessageContent(content);
      const state = await statePromise;
      expect(state.userMessageContent).toEqual(content);
    });

    it('should throw error for invalid user message content', () => {
      expect(() => stateService.setUserMessageContent('invalid' as any)).toThrow('Invalid user message content');
    });

    it('should throw error for invalid content block type', () => {
      expect(() => stateService.setUserMessageContent([{ type: 'invalid' }])).toThrow('Invalid content block type');
    });
  });

  describe('user message content ready management', () => {
    it('should update user message content ready state', async () => {
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.updateUserMessageContentReady(true);
      const state = await statePromise;
      expect(state.userMessageContentReady).toBe(true);
    });

    it('should throw error for invalid ready state', () => {
      expect(() => stateService.updateUserMessageContentReady('invalid' as any)).toThrow('Invalid ready state');
    });
  });

  describe('assistant message content management', () => {
    it('should set assistant message content', async () => {
      const content = [{ type: 'text', text: 'test' }];
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.setAssistantMessageContent(content);
      const state = await statePromise;
      expect(state.assistantMessageContent).toEqual(content);
    });

    it('should throw error for invalid assistant message content', () => {
      expect(() => stateService.setAssistantMessageContent('invalid' as any)).toThrow('Invalid assistant message content');
    });
  });

  describe('consecutive auto approved requests management', () => {
    it('should increment consecutive auto approved requests', async () => {
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.incrementConsecutiveAutoApprovedRequests();
      const state = await statePromise;
      expect(state.consecutiveAutoApprovedRequests).toBe(1);
    });

    it('should reset consecutive auto approved requests', async () => {
      stateService.incrementConsecutiveAutoApprovedRequests();
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.resetConsecutiveAutoApprovedRequests();
      const state = await statePromise;
      expect(state.consecutiveAutoApprovedRequests).toBe(0);
    });
  });

  describe('state updates', () => {
    it('should emit state updates', async () => {
      const statePromise = firstValueFrom(stateService.getStateUpdates());
      stateService.updateAbort(true);
      const state = await statePromise;
      expect(state.abort).toBe(true);
    });
  });
});
