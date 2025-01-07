import { injectable, inject } from 'inversify';
import { ClineStateService } from './ClineStateService';
import { BrowserActionResult, ClineSayBrowserAction } from '../shared/ExtensionMessage';
import { Logger } from '../utils/logger';

interface BrowserSession {
    id: string;
    startTime: Date;
    currentUrl?: string;
    lastAction?: ClineSayBrowserAction;
    lastResult?: BrowserActionResult;
}

@injectable()
export class BrowserSessionService {
    private activeSessions: Map<string, BrowserSession> = new Map();

    constructor(
        @inject(ClineStateService) private stateService: ClineStateService,
        @inject(Logger) private logger: Logger
    ) {}

    public async createSession(): Promise<string> {
        const sessionId = `browser-${Date.now()}`;
        const session: BrowserSession = {
            id: sessionId,
            startTime: new Date(),
        };
        
        this.activeSessions.set(sessionId, session);
        this.logger.info(`Created browser session: ${sessionId}`);
        return sessionId;
    }

    public async closeSession(sessionId: string): Promise<void> {
        if (!this.activeSessions.has(sessionId)) {
            throw new Error(`Session ${sessionId} not found`);
        }

        this.activeSessions.delete(sessionId);
        this.logger.info(`Closed browser session: ${sessionId}`);
    }

    public updateSessionState(
        sessionId: string,
        action: ClineSayBrowserAction,
        result: BrowserActionResult
    ): void {
        const session = this.activeSessions.get(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.lastAction = action;
        session.lastResult = result;
        session.currentUrl = result.currentUrl;

        this.activeSessions.set(sessionId, session);
    }

    public getSession(sessionId: string): BrowserSession | undefined {
        return this.activeSessions.get(sessionId);
    }

    public getAllSessions(): BrowserSession[] {
        return Array.from(this.activeSessions.values());
    }
} 