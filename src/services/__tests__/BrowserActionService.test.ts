import { BrowserActionService } from '../BrowserActionService';
import { BrowserSessionService } from '../BrowserSessionService';
import { Logger } from '../../utils/logger';
import { ClineSayBrowserAction, BrowserActionResult } from '../../shared/ExtensionMessage';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('BrowserActionService', () => {
    let browserActionService: BrowserActionService;
    let mockSessionService: jest.Mocked<BrowserSessionService>;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        mockSessionService = {
            getSession: vi.fn(),
            updateSessionState: vi.fn(),
        } as any;

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
        } as any;

        browserActionService = new BrowserActionService(mockSessionService, mockLogger);
    });

    describe('executeAction', () => {
        const sessionId = 'test-session';
        
        beforeEach(() => {
            mockSessionService.getSession.mockReturnValue({
                id: sessionId,
                startTime: new Date(),
            });
        });

        it('should execute launch action', async () => {
            const action: ClineSayBrowserAction = { action: 'launch' };
            const result = await browserActionService.executeAction(sessionId, action);
            
            expect(result.logs).toContain('Browser launched successfully');
            expect(mockSessionService.updateSessionState).toHaveBeenCalledWith(
                sessionId,
                action,
                expect.any(Object)
            );
        });

        it('should execute click action with coordinates', async () => {
            const action: ClineSayBrowserAction = {
                action: 'click',
                coordinate: '100,100'
            };
            const result = await browserActionService.executeAction(sessionId, action);
            
            expect(result.logs).toContain('Clicked at coordinate: 100,100');
        });

        it('should execute type action with text', async () => {
            const action: ClineSayBrowserAction = {
                action: 'type',
                text: 'test text'
            };
            const result = await browserActionService.executeAction(sessionId, action);
            
            expect(result.logs).toContain('Typed text: test text');
        });

        it('should execute scroll actions', async () => {
            const scrollDownAction: ClineSayBrowserAction = { action: 'scroll_down' };
            const scrollUpAction: ClineSayBrowserAction = { action: 'scroll_up' };
            
            const downResult = await browserActionService.executeAction(sessionId, scrollDownAction);
            const upResult = await browserActionService.executeAction(sessionId, scrollUpAction);
            
            expect(downResult.logs).toContain('Scrolled down');
            expect(upResult.logs).toContain('Scrolled up');
        });

        it('should throw error for invalid session', async () => {
            mockSessionService.getSession.mockReturnValue(undefined);
            
            const action: ClineSayBrowserAction = { action: 'launch' };
            await expect(browserActionService.executeAction('invalid-session', action)).rejects.toThrow();
        });

        it('should throw error for click action without coordinates', async () => {
            const action: ClineSayBrowserAction = { action: 'click' };
            await expect(browserActionService.executeAction(sessionId, action)).rejects.toThrow();
        });

        it('should throw error for type action without text', async () => {
            const action: ClineSayBrowserAction = { action: 'type' };
            await expect(browserActionService.executeAction(sessionId, action)).rejects.toThrow();
        });
    });
}); 