import { injectable, inject } from 'inversify';
import { BrowserSessionService } from './BrowserSessionService';
import { BrowserActionResult, ClineSayBrowserAction, BrowserAction } from '../shared/ExtensionMessage';
import { Logger } from '../utils/logger';

@injectable()
export class BrowserActionService {
    constructor(
        @inject(BrowserSessionService) private sessionService: BrowserSessionService,
        @inject(Logger) private logger: Logger
    ) {}

    public async executeAction(
        sessionId: string,
        action: ClineSayBrowserAction
    ): Promise<BrowserActionResult> {
        this.logger.info(`Executing browser action: ${action.action} for session ${sessionId}`);
        
        // Validate session exists
        const session = this.sessionService.getSession(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }

        try {
            const result = await this.performAction(action);
            this.sessionService.updateSessionState(sessionId, action, result);
            return result;
        } catch (error) {
            this.logger.error(`Failed to execute browser action: ${error}`);
            throw error;
        }
    }

    private async performAction(action: ClineSayBrowserAction): Promise<BrowserActionResult> {
        switch (action.action) {
            case 'launch':
                return this.handleLaunch();
            case 'click':
                return this.handleClick(action.coordinate);
            case 'type':
                return this.handleType(action.text);
            case 'scroll_down':
                return this.handleScroll('down');
            case 'scroll_up':
                return this.handleScroll('up');
            case 'close':
                return this.handleClose();
            default:
                throw new Error(`Unsupported browser action: ${action.action}`);
        }
    }

    private async handleLaunch(): Promise<BrowserActionResult> {
        // Implementation will be handled by the extension
        return {
            logs: 'Browser launched successfully'
        };
    }

    private async handleClick(coordinate?: string): Promise<BrowserActionResult> {
        if (!coordinate) {
            throw new Error('Coordinate is required for click action');
        }
        
        return {
            logs: `Clicked at coordinate: ${coordinate}`
        };
    }

    private async handleType(text?: string): Promise<BrowserActionResult> {
        if (!text) {
            throw new Error('Text is required for type action');
        }

        return {
            logs: `Typed text: ${text}`
        };
    }

    private async handleScroll(direction: 'up' | 'down'): Promise<BrowserActionResult> {
        return {
            logs: `Scrolled ${direction}`
        };
    }

    private async handleClose(): Promise<BrowserActionResult> {
        return {
            logs: 'Browser closed successfully'
        };
    }
} 