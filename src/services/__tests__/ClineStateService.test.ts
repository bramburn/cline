import { ClineStateService } from '../ClineStateService';
import { Anthropic } from '@anthropic-ai/sdk';
import { firstValueFrom } from 'rxjs';

describe('ClineStateService', () => {
  let stateService: ClineStateService;

  beforeEach(() => {
    stateService = new ClineStateService();
  });

  afterEach(() => {
    stateService.dispose();
  });

  // Abort State Management Tests
  describe('Abort State Management', () => {
    it('should set and reset abort state', async () => {
      // Test setAbort method
      stateService.setAbort(true);
      expect(stateService.isAborted).toBe(true);

      // Verify via observable
      const abortPromise = firstValueFrom(stateService.abort$);
      stateService.setAbort(true);
      const abort = await abortPromise;
      expect(abort).toBe(true);

      // Test reset
      stateService.resetAbort();
      expect(stateService.isAborted).toBe(false);
    });
  });

  // User Content Validation Tests
  describe('User Content Validation', () => {
    const validTextBlock: Anthropic.TextBlockParam = {
      type: 'text',
      text: 'Test text'
    };

    const validImageBlock: Anthropic.ImageBlockParam = {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'base64encodedimage'
      }
    };

    const validToolUseBlock: Anthropic.ToolUseBlockParam = {
      type: 'tool_use',
      id: 'tool-123',
      name: 'test_tool',
      input: {}
    };

    const invalidBlock = {
      type: 'invalid_type'
    };

    it('should validate user content correctly', () => {
      const validContent = [validTextBlock, validImageBlock, validToolUseBlock];
      const invalidContent = [validTextBlock, invalidBlock];

      expect(stateService.isValidUserContent(validContent)).toBe(true);
      expect(stateService.isValidUserContent(invalidContent)).toBe(false);
    });

    it('should set user message content only for valid content', () => {
      const validContent = [validTextBlock, validImageBlock];
      const invalidContent = [validTextBlock, invalidBlock];

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Test valid content
      stateService.setCurrentUserMessageContent(validContent);
      expect(stateService.userMessageContent).toEqual(validContent);

      // Test invalid content
      stateService.setCurrentUserMessageContent(invalidContent);
      expect(consoleSpy).toHaveBeenCalledWith('Invalid user content provided', invalidContent);

      consoleSpy.mockRestore();
    });
  });

  // Streaming State Tests
  describe('Streaming State Management', () => {
    it('should manage streaming state', async () => {
      // Test setting streaming state
      stateService.setIsStreaming(true);
      const isStreamingPromise = firstValueFrom(stateService.isStreaming$);
      const isStreaming = await isStreamingPromise;
      expect(isStreaming).toBe(true);

      // Test resetting streaming state
      stateService.setIsStreaming(false);
      const isNotStreamingPromise = firstValueFrom(stateService.isStreaming$);
      const isNotStreaming = await isNotStreamingPromise;
      expect(isNotStreaming).toBe(false);
    });
  });

  // Additional State Management Tests
  describe('Additional State Management', () => {
    it('should manage user message content ready state', () => {
      stateService.setUserMessageContentReady(true);
      expect(stateService.userMessageContentReady).toBe(true);

      stateService.setUserMessageContentReady(false);
      expect(stateService.userMessageContentReady).toBe(false);
    });

    it('should manage assistant message content', () => {
      const testContent = [{ 
        type: 'text', 
        content: 'Test assistant message',
        partial: false 
      }];

      stateService.setCurrentAssistantMessageContent(testContent);
      expect(stateService.getCurrentAssistantMessageContent()).toEqual(testContent);
    });
  });

  // Consecutive Auto-Approved Requests Tests
  describe('Consecutive Auto-Approved Requests', () => {
    it('should increment and reset consecutive auto-approved requests', () => {
      stateService.incrementConsecutiveAutoApprovedRequests();
      stateService.incrementConsecutiveAutoApprovedRequests();
      let state = stateService.getCurrentState();
      expect(state.consecutiveAutoApprovedRequestsCount).toBe(2);

      stateService.resetConsecutiveAutoApprovedRequests();
      state = stateService.getCurrentState();
      expect(state.consecutiveAutoApprovedRequestsCount).toBe(0);
    });
  });

  // Invalid State Updates Tests
  describe('Invalid State Updates', () => {
    it('should throw error for invalid state updates', () => {
      expect(() => stateService.updateIsStreaming(null as any)).toThrow('Invalid input');
      expect(() => stateService.updateAbort(undefined as any)).toThrow('Invalid input');
    });
  });
});
