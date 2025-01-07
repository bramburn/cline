import { injectable, inject } from 'inversify';
import { BrowserActionResult } from '../shared/ExtensionMessage';
import { Logger } from '../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

@injectable()
export class BrowserActionResultService {
    private readonly screenshotDir: string = 'screenshots';

    constructor(
        @inject(Logger) private logger: Logger
    ) {
        this.ensureScreenshotDirectory();
    }

    public async processResult(
        sessionId: string,
        result: BrowserActionResult
    ): Promise<BrowserActionResult> {
        try {
            const processedResult = { ...result };

            if (result.screenshot) {
                const screenshotPath = await this.saveScreenshot(sessionId, result.screenshot);
                processedResult.screenshot = screenshotPath;
            }

            if (result.logs) {
                await this.processLogs(sessionId, result.logs);
            }

            return processedResult;
        } catch (error) {
            this.logger.error(`Failed to process browser action result: ${error}`);
            throw error;
        }
    }

    private async saveScreenshot(sessionId: string, screenshotData: string): Promise<string> {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${sessionId}_${timestamp}.png`;
        const filepath = path.join(this.screenshotDir, filename);

        try {
            // Convert base64 to buffer and save
            const buffer = Buffer.from(screenshotData, 'base64');
            await fs.promises.writeFile(filepath, buffer);
            
            this.logger.info(`Screenshot saved: ${filepath}`);
            return filepath;
        } catch (error) {
            this.logger.error(`Failed to save screenshot: ${error}`);
            throw error;
        }
    }

    private async processLogs(sessionId: string, logs: string): Promise<void> {
        // Add timestamp to logs
        const timestamp = new Date().toISOString();
        const formattedLog = `[${timestamp}] [${sessionId}] ${logs}`;
        
        this.logger.info(formattedLog);
    }

    private async ensureScreenshotDirectory(): Promise<void> {
        try {
            await fs.promises.access(this.screenshotDir);
        } catch {
            await fs.promises.mkdir(this.screenshotDir, { recursive: true });
            this.logger.info(`Created screenshot directory: ${this.screenshotDir}`);
        }
    }

    public async cleanupSession(sessionId: string): Promise<void> {
        try {
            // Clean up any session-specific resources
            const files = await fs.promises.readdir(this.screenshotDir);
            const sessionFiles = files.filter(file => file.startsWith(sessionId));

            for (const file of sessionFiles) {
                await fs.promises.unlink(path.join(this.screenshotDir, file));
            }

            this.logger.info(`Cleaned up resources for session: ${sessionId}`);
        } catch (error) {
            this.logger.error(`Failed to cleanup session resources: ${error}`);
            throw error;
        }
    }
} 