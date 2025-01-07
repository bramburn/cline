import { BrowserSessionService } from '../BrowserSessionService';
import { ClineStateService } from '../ClineStateService';
import { Logger } from '../../utils/logger';
import { ClineSayBrowserAction, BrowserActionResult } from '../../shared/ExtensionMessage';

describe('BrowserSessionService', () => {
    let browserSessionService: BrowserSessionService;
    let mockStateService: jest.Mocked<ClineStateService>;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        mockStateService = {
            // Add mock methods as needed
        } as any;

        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
        } as any;

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
                logs: 'Clicked successfully',
                currentUrl: 'https://example.com'
            };

            browserSessionService.updateSessionState(sessionId, action, result);
            const session = browserSessionService.getSession(sessionId);

            expect(session).toBeDefined();
            expect(session?.lastAction).toEqual(action);
            expect(session?.lastResult).toEqual(result);
            expect(session?.currentUrl).toBe('https://example.com');
        });

        it('should throw error when updating non-existent session', () => {
            const action: ClineSayBrowserAction = { action: 'click' };
            const result: BrowserActionResult = { logs: 'test' };

            expect(() => browserSessionService.updateSessionState('non-existent', action, result)).toThrow();
        });
    });

    describe('getAllSessions', () => {
        it('should return all active sessions', async () => {
            await browserSessionService.createSession();
            await browserSessionService.createSession();

            const sessions = browserSessionService.getAllSessions();
            expect(sessions).toHaveLength(2);
        });
    });
}); 