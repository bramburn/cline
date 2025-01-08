import { describe, it, expect, beforeEach } from 'vitest';
import { BrowserSessionService } from '../BrowserSessionService';
import { ClineStateService } from '../ClineStateService';
import { Logger } from '../../utils/logger';
import { ClineSayBrowserAction, BrowserActionResult } from '../../shared/ExtensionMessage';

describe('BrowserSessionService', () => {
    let browserSessionService: BrowserSessionService;
    let mockStateService: { 
        // Add mock methods as needed 
        [key: string]: any 
    };
    let mockLogger: { 
        info: (msg: string) => void;
        error: (msg: string) => void;
        debug: (msg: string) => void;
        warn: (msg: string) => void;
    };

    beforeEach(() => {
        mockStateService = {
            // Add mock methods as needed
        };

        mockLogger = {
            info: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
            warn: vi.fn(),
        };

        browserSessionService = new BrowserSessionService(mockStateService, mockLogger);
    });

    describe('createSession', () => {
        it('should create a new session with unique id', async () => {
            const sessionId = await browserSessionService.createSession();
            expect(sessionId).toMatch(/^browser-\d+$/);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created browser session'));
        });
    });

    describe('closeSession', () => {
        it('should close an existing session', async () => {
            const sessionId = await browserSessionService.createSession();
            await browserSessionService.closeSession(sessionId);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Closed browser session'));
        });

        it('should throw error when closing non-existent session', async () => {
            await expect(browserSessionService.closeSession('non-existent')).rejects.toThrow();
        });
    });

    describe('updateSessionState', () => {
        it('should update session state with action and result', async () => {
            const sessionId = await browserSessionService.createSession();
            const action: ClineSayBrowserAction = {
                action: 'click',
                coordinate: '100,100'
            };
            const result: BrowserActionResult = {
                success: true,
                details: 'Clicked successfully'
            };

            await browserSessionService.updateSessionState(sessionId, action, result);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Updated session state'));
        });

        it('should throw error when updating non-existent session', async () => {
            const action: ClineSayBrowserAction = {
                action: 'click',
                coordinate: '100,100'
            };
            const result: BrowserActionResult = {
                success: true,
                details: 'Clicked successfully'
            };

            await expect(browserSessionService.updateSessionState('non-existent', action, result)).rejects.toThrow();
        });
    });

    describe('getAllSessions', () => {
        it('should return all active sessions', async () => {
            const sessionId1 = await browserSessionService.createSession();
            const sessionId2 = await browserSessionService.createSession();

            const sessions = browserSessionService.getAllSessions();
            expect(sessions.length).toBe(2);
            expect(sessions).toContain(sessionId1);
            expect(sessions).toContain(sessionId2);
        });
    });
});