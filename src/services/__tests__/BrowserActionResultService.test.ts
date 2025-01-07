import { BrowserActionResultService } from '../BrowserActionResultService';
import { Logger } from '../../utils/logger';
import { BrowserActionResult } from '../../shared/ExtensionMessage';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        access: jest.fn(),
        mkdir: jest.fn(),
        readdir: jest.fn(),
        unlink: jest.fn(),
    }
}));

describe('BrowserActionResultService', () => {
    let browserActionResultService: BrowserActionResultService;
    let mockLogger: jest.Mocked<Logger>;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            warn: jest.fn(),
        } as any;

        // Reset fs mock implementations
        (fs.promises.access as jest.Mock).mockReset();
        (fs.promises.mkdir as jest.Mock).mockReset();
        (fs.promises.writeFile as jest.Mock).mockReset();
        (fs.promises.readdir as jest.Mock).mockReset();
        (fs.promises.unlink as jest.Mock).mockReset();

        browserActionResultService = new BrowserActionResultService(mockLogger);
    });

    describe('processResult', () => {
        const sessionId = 'test-session';
        const mockScreenshotData = 'base64-screenshot-data';
        
        it('should process result with screenshot', async () => {
            const result: BrowserActionResult = {
                screenshot: mockScreenshotData,
                logs: 'Test logs'
            };

            (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

            const processedResult = await browserActionResultService.processResult(sessionId, result);

            expect(processedResult.screenshot).toMatch(/^screenshots\/test-session_.*\.png$/);
            expect(fs.promises.writeFile).toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Screenshot saved'));
        });

        it('should process result with logs', async () => {
            const result: BrowserActionResult = {
                logs: 'Test logs'
            };

            const processedResult = await browserActionResultService.processResult(sessionId, result);

            expect(processedResult.logs).toBe('Test logs');
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('[test-session] Test logs'));
        });

        it('should handle screenshot save failure', async () => {
            const result: BrowserActionResult = {
                screenshot: mockScreenshotData
            };

            (fs.promises.writeFile as jest.Mock).mockRejectedValue(new Error('Write failed'));

            await expect(browserActionResultService.processResult(sessionId, result)).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('cleanupSession', () => {
        const sessionId = 'test-session';

        it('should cleanup session resources', async () => {
            const mockFiles = [
                'test-session_123.png',
                'test-session_456.png',
                'other-session.png'
            ];

            (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
            (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

            await browserActionResultService.cleanupSession(sessionId);

            expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Cleaned up resources'));
        });

        it('should handle cleanup failure', async () => {
            (fs.promises.readdir as jest.Mock).mockRejectedValue(new Error('Read failed'));

            await expect(browserActionResultService.cleanupSession(sessionId)).rejects.toThrow();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('initialization', () => {
        it('should create screenshot directory if it does not exist', async () => {
            (fs.promises.access as jest.Mock).mockRejectedValue(new Error('Not found'));
            
            // Re-create service to trigger initialization
            browserActionResultService = new BrowserActionResultService(mockLogger);
            
            expect(fs.promises.mkdir).toHaveBeenCalledWith('screenshots', { recursive: true });
            expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Created screenshot directory'));
        });

        it('should not create screenshot directory if it exists', async () => {
            (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
            
            // Re-create service to trigger initialization
            browserActionResultService = new BrowserActionResultService(mockLogger);
            
            expect(fs.promises.mkdir).not.toHaveBeenCalled();
        });
    });
}); 